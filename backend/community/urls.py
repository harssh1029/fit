from django.urls import path

from .views import (
	ActivityFeedView,
	AddFriendView,
	CommunitySummaryView,
	ContactSyncView,
	FriendListView,
	LeaderboardView,
	RemoveFriendView,
	UserSearchView,
)


urlpatterns = [
	path('community/summary/', CommunitySummaryView.as_view(), name='community-summary'),
	path('community/friends/', FriendListView.as_view(), name='community-friends'),
	path('community/friends/add/', AddFriendView.as_view(), name='community-add-friend'),
	path('community/friends/<int:user_id>/', RemoveFriendView.as_view(), name='community-remove-friend'),
	path('community/search/', UserSearchView.as_view(), name='community-search'),
	path('community/contacts/sync/', ContactSyncView.as_view(), name='community-contact-sync'),
	path('community/leaderboard/', LeaderboardView.as_view(), name='community-leaderboard'),
	path('community/activity/', ActivityFeedView.as_view(), name='community-activity'),
]

