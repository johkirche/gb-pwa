<template>
  <Card v-if="user">
    <CardHeader>
      <CardTitle class="flex items-center">
        <User class="w-5 h-5 mr-2 text-muted-foreground" />
        User Information
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-4">
          <HomeUserInfoField
            :icon="Tag"
            label="User ID"
            :value="user.id"
            :monospace="true"
          />
          <HomeUserInfoField :icon="Mail" label="Email" :value="user.email" />
        </div>
        <div class="space-y-4">
          <HomeUserInfoField
            v-if="user.first_name"
            :icon="UserCheck"
            label="First Name"
            :value="user.first_name"
          />
          <HomeUserInfoField
            v-if="user.last_name"
            :icon="UserCheck"
            label="Last Name"
            :value="user.last_name"
          />
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup>
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import HomeUserInfoField from "./UserInfoField.vue";
import { User, Tag, Mail, UserCheck } from "lucide-vue-next";

defineProps({
  user: {
    type: Object,
    required: true,
  },
});
</script>
