<template>
  <div class="min-h-screen bg-background">
    <!-- Navigation Header -->
    <nav class="bg-card border-b">
      <div class="container mx-auto">
        <div class="flex justify-between h-16 items-center">
          <h1 class="text-xl font-semibold">Welcome, {{ userName }}!</h1>
          <Button variant="destructive" size="sm" @click="handleLogout">
            <LogOut class="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="container mx-auto py-8">
      <!-- Welcome Section -->
      <Card class="mb-8">
        <CardHeader class="text-center">
          <CardTitle class="text-3xl"> Protected Home Page </CardTitle>
          <CardDescription class="text-lg">
            This page is only accessible to authenticated users. Welcome to your
            dashboard!
          </CardDescription>
        </CardHeader>
        <CardContent class="text-center">
          <Badge
            variant="secondary"
            class="bg-green-100 text-green-800 hover:bg-green-100"
          >
            <CheckCircle class="w-4 h-4 mr-2" />
            Authenticated
          </Badge>
        </CardContent>
      </Card>

      <!-- User Information Card -->
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
              <div class="flex items-center p-4 bg-muted rounded-lg">
                <Tag class="w-5 h-5 text-muted-foreground mr-3" />
                <div>
                  <p class="text-sm font-medium text-muted-foreground">
                    User ID
                  </p>
                  <p class="text-sm font-mono">{{ user.id }}</p>
                </div>
              </div>

              <div class="flex items-center p-4 bg-muted rounded-lg">
                <Mail class="w-5 h-5 text-muted-foreground mr-3" />
                <div>
                  <p class="text-sm font-medium text-muted-foreground">Email</p>
                  <p class="text-sm">{{ user.email }}</p>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <div
                v-if="user.first_name"
                class="flex items-center p-4 bg-muted rounded-lg"
              >
                <UserCheck class="w-5 h-5 text-muted-foreground mr-3" />
                <div>
                  <p class="text-sm font-medium text-muted-foreground">
                    First Name
                  </p>
                  <p class="text-sm">{{ user.first_name }}</p>
                </div>
              </div>

              <div
                v-if="user.last_name"
                class="flex items-center p-4 bg-muted rounded-lg"
              >
                <UserCheck class="w-5 h-5 text-muted-foreground mr-3" />
                <div>
                  <p class="text-sm font-medium text-muted-foreground">
                    Last Name
                  </p>
                  <p class="text-sm">{{ user.last_name }}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  LogOut,
  CheckCircle,
  User,
  Tag,
  Mail,
  UserCheck,
} from "lucide-vue-next";

const { user, userName, logout } = useAuth();

const handleLogout = async () => {
  await logout();
};
</script>
