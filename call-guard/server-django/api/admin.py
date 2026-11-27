from django.contrib import admin

from .models import BlockedCall, Report, SpamNumber, Subscription, User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("phone", "status", "market", "created_at", "activated_at")
    list_filter = ("status", "market")
    search_fields = ("phone", "email", "display_name")


@admin.register(SpamNumber)
class SpamNumberAdmin(admin.ModelAdmin):
    list_display = ("e164", "category", "label_zh", "confidence", "source", "region", "updated_at")
    list_filter = ("category", "region", "source")
    search_fields = ("e164", "label_zh")


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("user", "amount_cents", "currency", "status", "paid_at")


@admin.register(BlockedCall)
class BlockedCallAdmin(admin.ModelAdmin):
    list_display = ("user", "e164", "category", "blocked_at")


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("user", "e164", "category", "status", "created_at")
