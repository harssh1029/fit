from rest_framework import serializers

from .models import Badge, CategoryLevel, UserBadge, UserLevel


class BadgeSerializer(serializers.ModelSerializer):
	class Meta:
		model = Badge
		fields = [
			'id',
			'name',
			'description',
			'category',
			'tier',
			'icon',
			'rarity',
			'unlock_description',
			'is_repeatable',
			'is_periodic',
			'display_priority',
			'shareable_card_enabled',
		]


class UserBadgeSerializer(serializers.ModelSerializer):
	badge = BadgeSerializer(read_only=True)
	earnedAt = serializers.DateTimeField(source='earned_at', read_only=True)
	sourceType = serializers.CharField(source='source_type', read_only=True)
	sourceId = serializers.CharField(source='source_id', read_only=True)
	periodKey = serializers.CharField(source='period_key', read_only=True)

	class Meta:
		model = UserBadge
		fields = ['id', 'badge', 'earnedAt', 'sourceType', 'sourceId', 'periodKey', 'metadata']


class UserLevelSerializer(serializers.ModelSerializer):
	careerXp = serializers.IntegerField(source='career_xp', read_only=True)
	currentLevel = serializers.IntegerField(source='current_level', read_only=True)
	currentTitle = serializers.CharField(source='current_title', read_only=True)
	currentLevelXp = serializers.IntegerField(source='current_level_xp', read_only=True)
	nextLevelXp = serializers.IntegerField(source='next_level_xp', read_only=True)

	class Meta:
		model = UserLevel
		fields = ['careerXp', 'currentLevel', 'currentTitle', 'currentLevelXp', 'nextLevelXp', 'updated_at']


class CategoryLevelSerializer(serializers.ModelSerializer):
	nextTierXp = serializers.IntegerField(source='next_tier_xp', read_only=True)

	class Meta:
		model = CategoryLevel
		fields = ['category', 'xp', 'tier', 'nextTierXp', 'updated_at']
