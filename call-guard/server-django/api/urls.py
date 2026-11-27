from django.urls import path

from . import views

urlpatterns = [
    path("health", views.health),
    path("api/register", views.register),
    path("api/users/<uuid:user_id>", views.get_user),
    path("api/users/<uuid:user_id>/pay", views.pay),
    path("api/users/<uuid:user_id>/blocked-calls", views.list_blocked_calls),
    path("api/lists/candidates", views.list_candidates),
    path("api/lists/active", views.list_active),
    path("api/blocklist", views.blocklist),
    path("api/blocked-calls", views.create_blocked_call),
    path("api/spam-numbers", views.create_spam_number),
    path("api/reports", views.create_report),
]
