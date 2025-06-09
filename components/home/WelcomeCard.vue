<template>
    <Card class="mb-8">
        <CardHeader class="text-center">
            <CardTitle class="text-3xl">Protected Home Page</CardTitle>
            <CardDescription class="text-lg">
                This page is only accessible to authenticated users. Welcome to your
                dashboard!
            </CardDescription>
        </CardHeader>
        <CardContent class="text-center">
            <Badge variant="secondary" class="bg-green-100 text-green-800 hover:bg-green-100">
                <CheckCircle class="w-4 h-4 mr-2" />
                Authenticated
            </Badge>
        </CardContent>
    </Card>
</template>

<script setup lang="ts">
import { CheckCircle } from "lucide-vue-next";
</script>
