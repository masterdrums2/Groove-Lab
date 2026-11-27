import uuid

from django.db import models


class User(models.Model):
    class Status(models.TextChoices):
        CANDIDATE = "candidate", "candidate"
        ACTIVE = "active", "active"
        CANCELLED = "cancelled", "cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField(max_length=32, unique=True)
    email = models.EmailField(null=True, blank=True)
    display_name = models.CharField(max_length=120, null=True, blank=True)
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.CANDIDATE
    )
    market = models.CharField(max_length=8, default="HK")
    created_at = models.DateTimeField(auto_now_add=True)
    activated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "users"


class Subscription(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "pending"
        PAID = "paid", "paid"
        FAILED = "failed", "failed"
        CANCELLED = "cancelled", "cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="subscriptions")
    amount_cents = models.PositiveIntegerField(default=100)
    currency = models.CharField(max_length=8, default="HKD")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "subscriptions"


class SpamNumber(models.Model):
    class Category(models.TextChoices):
        HARASSMENT = "harassment", "harassment"
        SCAM = "scam", "scam"
        TELEMARKETING = "telemarketing", "telemarketing"
        LOAN = "loan", "loan"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    e164 = models.CharField(max_length=32, unique=True)
    category = models.CharField(max_length=32, choices=Category.choices)
    label_zh = models.CharField(max_length=120)
    confidence = models.FloatField(default=0.8)
    source = models.CharField(max_length=64, default="seed")
    region = models.CharField(max_length=8, default="HK")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "spam_numbers"
        indexes = [models.Index(fields=["region", "category"])]


class BlockedCall(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="blocked_calls")
    e164 = models.CharField(max_length=32)
    category = models.CharField(max_length=32, null=True, blank=True)
    label_zh = models.CharField(max_length=120, null=True, blank=True)
    blocked_at = models.DateTimeField()

    class Meta:
        db_table = "blocked_calls"
        ordering = ["-blocked_at"]


class Report(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "pending"
        ACCEPTED = "accepted", "accepted"
        REJECTED = "rejected", "rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reports")
    e164 = models.CharField(max_length=32)
    category = models.CharField(max_length=32, choices=SpamNumber.Category.choices)
    note = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACCEPTED)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "reports"
