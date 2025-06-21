<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center space-x-2">
        <BookOpen class="w-5 h-5" />
        <span>{{ t("offline.tutorial.title") }}</span>
      </CardTitle>
      <CardDescription>
        {{ t("offline.tutorial.description") }}
      </CardDescription>
    </CardHeader>

    <CardContent>
      <Tabs default-value="benefits" class="w-full">
        <TabsList class="w-full mb-3">
          <TabsTrigger value="benefits">{{
            t("offline.tutorial.benefits")
          }}</TabsTrigger>
          <TabsTrigger value="chrome">{{
            t("offline.tutorial.chrome")
          }}</TabsTrigger>
          <TabsTrigger value="ios">{{ t("offline.tutorial.ios") }}</TabsTrigger>
          <TabsTrigger value="android">{{
            t("offline.tutorial.android")
          }}</TabsTrigger>
        </TabsList>

        <!-- Benefits Tab -->
        <TabsContent value="benefits" class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="flex items-start space-x-3">
              <div class="bg-blue-100 p-2 rounded-full">
                <Zap class="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 class="font-medium text-sm">
                  {{ t("offline.tutorial.benefitsFast") }}
                </h4>
                <p class="text-xs text-muted-foreground mt-1">
                  {{ t("offline.tutorial.benefitsFastDesc") }}
                </p>
              </div>
            </div>

            <div class="flex items-start space-x-3">
              <div class="bg-green-100 p-2 rounded-full">
                <WifiOff class="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 class="font-medium text-sm">
                  {{ t("offline.tutorial.benefitsOffline") }}
                </h4>
                <p class="text-xs text-muted-foreground mt-1">
                  {{ t("offline.tutorial.benefitsOfflineDesc") }}
                </p>
              </div>
            </div>

            <div class="flex items-start space-x-3">
              <div class="bg-purple-100 p-2 rounded-full">
                <Home class="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h4 class="font-medium text-sm">
                  {{ t("offline.tutorial.benefitsHomeScreen") }}
                </h4>
                <p class="text-xs text-muted-foreground mt-1">
                  {{ t("offline.tutorial.benefitsHomeScreenDesc") }}
                </p>
              </div>
            </div>

            <div class="flex items-start space-x-3">
              <div class="bg-orange-100 p-2 rounded-full">
                <Bell class="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h4 class="font-medium text-sm">
                  {{ t("offline.tutorial.benefitsNotifications") }}
                </h4>
                <p class="text-xs text-muted-foreground mt-1">
                  {{ t("offline.tutorial.benefitsNotificationsDesc") }}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <!-- Chrome Tab -->
        <TabsContent value="chrome" class="space-y-4">
          <div class="space-y-3">
            <div class="flex items-start space-x-3">
              <Badge variant="outline" class="text-xs">1</Badge>
              <div>
                <p class="text-sm">{{ t("offline.tutorial.chromeStep1") }}</p>
              </div>
            </div>
            <div class="flex items-start space-x-3">
              <Badge variant="outline" class="text-xs">2</Badge>
              <div>
                <p class="text-sm">{{ t("offline.tutorial.chromeStep2") }}</p>
              </div>
            </div>
            <div class="flex items-start space-x-3">
              <Badge variant="outline" class="text-xs">3</Badge>
              <div>
                <p class="text-sm">{{ t("offline.tutorial.chromeStep3") }}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <!-- iOS Tab -->
        <TabsContent value="ios" class="space-y-4">
          <div class="space-y-3">
            <div class="flex items-start space-x-3">
              <Badge variant="outline" class="text-xs">1</Badge>
              <div>
                <p class="text-sm">{{ t("offline.tutorial.iosStep1") }}</p>
              </div>
            </div>
            <div class="flex items-start space-x-3">
              <Badge variant="outline" class="text-xs">2</Badge>
              <div>
                <p class="text-sm">{{ t("offline.tutorial.iosStep2") }}</p>
              </div>
            </div>
            <div class="flex items-start space-x-3">
              <Badge variant="outline" class="text-xs">3</Badge>
              <div>
                <p class="text-sm">{{ t("offline.tutorial.iosStep3") }}</p>
              </div>
            </div>
            <div class="flex items-start space-x-3">
              <Badge variant="outline" class="text-xs">4</Badge>
              <div>
                <p class="text-sm">{{ t("offline.tutorial.iosStep4") }}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <!-- Android Tab -->
        <TabsContent value="android" class="space-y-4">
          <div class="space-y-3">
            <div class="flex items-start space-x-3">
              <Badge variant="outline" class="text-xs">1</Badge>
              <div>
                <p class="text-sm">{{ t("offline.tutorial.androidStep1") }}</p>
              </div>
            </div>
            <div class="flex items-start space-x-3">
              <Badge variant="outline" class="text-xs">2</Badge>
              <div>
                <p class="text-sm">{{ t("offline.tutorial.androidStep2") }}</p>
              </div>
            </div>
            <div class="flex items-start space-x-3">
              <Badge variant="outline" class="text-xs">3</Badge>
              <div>
                <p class="text-sm">{{ t("offline.tutorial.androidStep3") }}</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Bell, BookOpen, Home, WifiOff, Zap } from "lucide-vue-next";

import { useI18n } from "vue-i18n";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const { t } = useI18n();
</script>
