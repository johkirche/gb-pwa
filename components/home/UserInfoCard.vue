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
                    <UserInfoField :icon="Tag" label="User ID" :value="user.id" :monospace="true" />
                    <UserInfoField :icon="Mail" label="Email" :value="user.email" />
                </div>
                <div class="space-y-4">
                    <UserInfoField v-if="user.first_name" :icon="UserCheck" label="First Name"
                        :value="user.first_name" />
                    <UserInfoField v-if="user.last_name" :icon="UserCheck" label="Last Name" :value="user.last_name" />
                </div>
            </div>
        </CardContent>
    </Card>
</template>

<script setup>
import { User, Tag, Mail, UserCheck } from "lucide-vue-next";

const props = defineProps({
    user: {
        type: Object,
        required: true
    }
});
</script>
