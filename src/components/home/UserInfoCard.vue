<template>
  <Card v-if="user">
    <CardHeader>
      <CardTitle class="flex items-center">
        <User class="w-5 h-5 mr-2 text-muted-foreground" />
        {{ t("home.userInformation") }}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-4">
          <HomeUserInfoField
            :icon="Tag"
            :label="t('home.userID')"
            :value="user.id"
            :monospace="true"
          />
          <HomeUserInfoField :icon="Mail" :label="t('home.email')" :value="user.email" />
        </div>
        <div class="space-y-4">
          <HomeUserInfoField
            v-if="user.first_name"
            :icon="UserCheck"
            :label="t('home.firstName')"
            :value="user.first_name"
          />
          <HomeUserInfoField
            v-if="user.last_name"
            :icon="UserCheck"
            :label="t('home.lastName')"
            :value="user.last_name"
          />
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Mail, Tag, User, UserCheck } from "lucide-vue-next";

import { useI18n } from "vue-i18n";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import HomeUserInfoField from "@/components/home/UserInfoField.vue";

const { t } = useI18n();

defineProps({
  user: {
    type: Object,
    required: true,
  },
});
</script>
