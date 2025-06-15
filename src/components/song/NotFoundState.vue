<template>
  <Card class="text-center py-12">
    <CardContent>
      <Music class="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <h3 class="text-lg font-medium mb-2">Song not found</h3>
      <p class="text-muted-foreground mb-4">
        The requested song could not be found.
      </p>
      <Button variant="outline" @click="router.push('/lieder')">
        <ArrowLeft class="w-4 h-4 mr-2" />
        Back to Song List
      </Button>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Music, ArrowLeft } from "lucide-vue-next";

const router = useRouter();
</script>
