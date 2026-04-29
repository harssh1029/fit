from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
	initial = True

	dependencies = [
		migrations.swappable_dependency(settings.AUTH_USER_MODEL),
	]

	operations = [
		migrations.CreateModel(
			name='UserPublicCard',
			fields=[
				('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
				('display_name', models.CharField(blank=True, max_length=255)),
				('username', models.CharField(blank=True, max_length=150)),
				('avatar_initials', models.CharField(blank=True, max_length=4)),
				('consistency_score', models.PositiveSmallIntegerField(default=0)),
				('challenges_completed', models.PositiveIntegerField(default=0)),
				('body_balance_percent', models.PositiveSmallIntegerField(default=0)),
				('active_plan_name', models.CharField(blank=True, max_length=255)),
				('streak_days', models.PositiveIntegerField(default=0)),
				('recent_sessions_this_week', models.PositiveIntegerField(default=0)),
				('fitness_age_years', models.PositiveSmallIntegerField(blank=True, null=True)),
				('metadata', models.JSONField(blank=True, default=dict)),
				('updated_at', models.DateTimeField(auto_now=True)),
				('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='public_card', to=settings.AUTH_USER_MODEL)),
			],
			options={'ordering': ['display_name', 'username']},
		),
		migrations.CreateModel(
			name='Friendship',
			fields=[
				('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
				('status', models.CharField(choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('blocked', 'Blocked')], default='accepted', max_length=16)),
				('created_at', models.DateTimeField(auto_now_add=True)),
				('updated_at', models.DateTimeField(auto_now=True)),
				('from_user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='friendships_sent', to=settings.AUTH_USER_MODEL)),
				('to_user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='friendships_received', to=settings.AUTH_USER_MODEL)),
			],
			options={'unique_together': {('from_user', 'to_user')}},
		),
		migrations.CreateModel(
			name='CommunityActivity',
			fields=[
				('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
				('activity_type', models.CharField(choices=[('workout', 'Workout'), ('challenge', 'Challenge'), ('plan', 'Plan'), ('test', 'Fitness test')], max_length=24)),
				('title', models.CharField(max_length=255)),
				('description', models.CharField(blank=True, max_length=500)),
				('score', models.FloatField(blank=True, null=True)),
				('metadata', models.JSONField(blank=True, default=dict)),
				('occurred_at', models.DateTimeField()),
				('created_at', models.DateTimeField(auto_now_add=True)),
				('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='community_activities', to=settings.AUTH_USER_MODEL)),
			],
			options={'ordering': ['-occurred_at', '-id']},
		),
		migrations.CreateModel(
			name='ContactSyncInvite',
			fields=[
				('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
				('identifier', models.CharField(max_length=255)),
				('source', models.CharField(default='contacts', max_length=32)),
				('created_at', models.DateTimeField(auto_now_add=True)),
				('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='community_invites', to=settings.AUTH_USER_MODEL)),
			],
			options={'ordering': ['-created_at'], 'unique_together': {('user', 'identifier')}},
		),
		migrations.AddIndex(
			model_name='friendship',
			index=models.Index(fields=['from_user', 'status'], name='community_f_from_us_9cc3f9_idx'),
		),
		migrations.AddIndex(
			model_name='friendship',
			index=models.Index(fields=['to_user', 'status'], name='community_f_to_user_a9cfb5_idx'),
		),
		migrations.AddIndex(
			model_name='communityactivity',
			index=models.Index(fields=['user', 'occurred_at'], name='community_c_user_id_d1dc28_idx'),
		),
		migrations.AddIndex(
			model_name='communityactivity',
			index=models.Index(fields=['activity_type', 'occurred_at'], name='community_c_activit_430a2e_idx'),
		),
	]
