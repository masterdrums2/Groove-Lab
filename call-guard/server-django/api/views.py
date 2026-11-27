from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .hk_phone import is_hong_kong_member_phone, normalize_hk_e164
from .models import BlockedCall, Report, SpamNumber, Subscription, User
from .serializers import UserPublicSerializer

MARKET = "HK"
CATEGORY_LABELS = {
    "harassment": "騷擾電話（香港）",
    "scam": "疑似騙案電話（香港）",
    "telemarketing": "推銷電話（香港）",
    "loan": "財務借貸推介（香港）",
}
ALLOWED = set(CATEGORY_LABELS)


def public_user(user: User) -> dict:
    return UserPublicSerializer(user).data


def upsert_spam_number(*, e164: str, category: str, label_zh: str | None, confidence: float, source: str):
    obj, created = SpamNumber.objects.update_or_create(
        e164=e164,
        defaults={
            "category": category,
            "label_zh": label_zh or CATEGORY_LABELS[category],
            "confidence": confidence,
            "source": source,
            "region": "HK",
        },
    )
    if not created and confidence > (obj.confidence or 0):
        obj.confidence = confidence
        obj.save(update_fields=["confidence", "updated_at"])
    return obj


@api_view(["GET"])
def health(_request):
    return Response({"ok": True, "service": "call-guard-django", "market": MARKET})


@api_view(["POST"])
def register(request):
    phone = request.data.get("phone")
    email = request.data.get("email")
    display_name = request.data.get("displayName")

    if not phone or not isinstance(phone, str):
        return Response({"error": "phone is required"}, status=status.HTTP_400_BAD_REQUEST)

    if not is_hong_kong_member_phone(phone):
        return Response(
            {
                "error": "hk_phone_required",
                "message": "只支援香港號碼（+852）。本服務淨係欄截喺香港收到嘅來電。",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    normalized = normalize_hk_e164(phone)
    existing = User.objects.filter(phone=normalized).first()
    if existing:
        return Response({"user": public_user(existing), "created": False})

    user = User.objects.create(
        phone=normalized,
        email=email or None,
        display_name=display_name or None,
        status=User.Status.CANDIDATE,
        market=MARKET,
    )
    return Response({"user": public_user(user), "created": True}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def get_user(request, user_id):
    user = get_object_or_404(User, pk=user_id)
    return Response({"user": public_user(user)})


@api_view(["GET"])
def list_candidates(_request):
    users = User.objects.filter(status=User.Status.CANDIDATE).order_by("-created_at")
    return Response({"users": [public_user(u) for u in users]})


@api_view(["GET"])
def list_active(_request):
    users = User.objects.filter(status=User.Status.ACTIVE).order_by("-activated_at")
    return Response({"users": [public_user(u) for u in users]})


@api_view(["POST"])
def pay(request, user_id):
    user = get_object_or_404(User, pk=user_id)
    paid_at = timezone.now()
    with transaction.atomic():
        sub = Subscription.objects.create(
            user=user,
            amount_cents=100,
            currency="HKD",
            status=Subscription.Status.PAID,
            paid_at=paid_at,
        )
        user.status = User.Status.ACTIVE
        user.activated_at = paid_at
        user.save(update_fields=["status", "activated_at"])

    return Response(
        {
            "user": public_user(user),
            "subscription": {
                "id": str(sub.id),
                "amountCents": 100,
                "currency": "HKD",
                "status": "paid",
                "paidAt": paid_at.isoformat().replace("+00:00", "Z"),
            },
        }
    )


@api_view(["GET"])
def blocklist(request):
    user_id = request.query_params.get("userId")
    if not user_id:
        return Response({"error": "userId required"}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(pk=user_id).first()
    if not user:
        return Response({"error": "not found"}, status=status.HTTP_404_NOT_FOUND)
    if user.status != User.Status.ACTIVE:
        return Response(
            {
                "error": "membership_inactive",
                "message": "付費開通後先會同步欄截名單",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    numbers = list(
        SpamNumber.objects.filter(region="HK")
        .order_by("e164")
        .values("e164", "category", "label_zh", "confidence", "updated_at")
    )
    payload = [
        {
            "e164": n["e164"],
            "category": n["category"],
            "labelZh": n["label_zh"],
            "confidence": n["confidence"],
            "updatedAt": n["updated_at"].isoformat().replace("+00:00", "Z"),
        }
        for n in numbers
    ]
    version = payload[-1]["updatedAt"] if payload else timezone.now().isoformat()
    return Response(
        {"market": MARKET, "version": version, "count": len(payload), "numbers": payload}
    )


@api_view(["POST"])
def create_blocked_call(request):
    user_id = request.data.get("userId")
    e164 = request.data.get("e164")
    category = request.data.get("category")
    label_zh = request.data.get("labelZh")
    blocked_at = request.data.get("blockedAt")

    if not user_id or not e164:
        return Response(
            {"error": "userId and e164 required"}, status=status.HTTP_400_BAD_REQUEST
        )

    user = User.objects.filter(pk=user_id).first()
    if not user or user.status != User.Status.ACTIVE:
        return Response({"error": "membership_inactive"}, status=status.HTTP_403_FORBIDDEN)

    spam = SpamNumber.objects.filter(e164=e164).first()
    when = timezone.now()
    if blocked_at:
        parsed = parse_datetime(str(blocked_at).replace("Z", "+00:00"))
        if parsed:
            when = parsed

    call = BlockedCall.objects.create(
        user=user,
        e164=e164,
        category=category or (spam.category if spam else None),
        label_zh=label_zh or (spam.label_zh if spam else "已欄截來電"),
        blocked_at=when,
    )
    return Response(
        {
            "call": {
                "id": str(call.id),
                "e164": call.e164,
                "category": call.category,
                "labelZh": call.label_zh,
                "blockedAt": call.blocked_at.isoformat().replace("+00:00", "Z"),
            }
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
def list_blocked_calls(_request, user_id):
    user = get_object_or_404(User, pk=user_id)
    calls = user.blocked_calls.all()[:200]
    return Response(
        {
            "calls": [
                {
                    "id": str(c.id),
                    "e164": c.e164,
                    "category": c.category,
                    "labelZh": c.label_zh,
                    "blockedAt": c.blocked_at.isoformat().replace("+00:00", "Z"),
                }
                for c in calls
            ]
        }
    )


@api_view(["POST"])
def create_spam_number(request):
    e164 = request.data.get("e164")
    category = request.data.get("category")
    label_zh = request.data.get("labelZh")
    confidence = request.data.get("confidence", 0.85)

    if not e164 or category not in ALLOWED:
        return Response(
            {"error": "e164 and valid category required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    normalized = normalize_hk_e164(e164) or e164
    obj = upsert_spam_number(
        e164=normalized,
        category=category,
        label_zh=label_zh,
        confidence=float(confidence),
        source="manual",
    )
    return Response(
        {
            "ok": True,
            "e164": obj.e164,
            "category": obj.category,
            "updatedAt": obj.updated_at.isoformat().replace("+00:00", "Z"),
            "region": "HK",
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
def create_report(request):
    user_id = request.data.get("userId")
    e164 = request.data.get("e164")
    category = request.data.get("category")
    note = request.data.get("note")

    if not user_id or not e164 or category not in ALLOWED:
        return Response(
            {"error": "userId, e164 and valid category required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = User.objects.filter(pk=user_id).first()
    if not user or user.status != User.Status.ACTIVE:
        return Response(
            {
                "error": "membership_inactive",
                "message": "付費開通後先可以舉報，令其他會員一齊攔",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    normalized = normalize_hk_e164(e164) or e164
    with transaction.atomic():
        report = Report.objects.create(
            user=user,
            e164=normalized,
            category=category,
            note=note or None,
            status=Report.Status.ACCEPTED,
        )
        upsert_spam_number(
            e164=normalized,
            category=category,
            label_zh=CATEGORY_LABELS[category],
            confidence=0.88,
            source="member_report",
        )

    active_count = User.objects.filter(status=User.Status.ACTIVE).count()
    return Response(
        {
            "report": {
                "id": str(report.id),
                "e164": normalized,
                "category": category,
                "status": "accepted",
                "createdAt": report.created_at.isoformat().replace("+00:00", "Z"),
            },
            "sharedWithActiveMembers": active_count,
            "message": "已作補漏入庫。主攔截仍靠預建名單；其他已開通會員下次同步後會一齊攔呢個新號碼。",
        },
        status=status.HTTP_201_CREATED,
    )
