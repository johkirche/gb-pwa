<template>
    <div class="min-h-screen bg-background">
        <AppHeader :page-title="t('churchService.title')" :show-back-button="true" />
        <ScrollArea class="h-[calc(100vh-65px)]">
            <main class="container mx-auto py-8 space-y-8">
                <!-- Current Service Setup -->
                <Card>
                    <CardHeader>
                        <CardTitle class="flex items-center space-x-2">
                            <span>⛪</span>
                            <span>{{ t('churchService.currentService') }}</span>
                        </CardTitle>
                        <CardDescription>
                            {{ t('churchService.selectTwoSongs') }}
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-6">
                        <!-- Song Selection -->
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <!-- First Song -->
                            <div class="space-y-4">
                                <h3 class="text-lg font-semibold">
                                    {{ t('churchService.firstSong') }}
                                </h3>
                                <SongSelector
:selected-song="currentService.firstSong"
                                    :placeholder="t('churchService.selectFirstSong')"
                                    @song-selected="(song) => selectSong(1, song)" />
                                <VerseSelector
v-if="currentService.firstSong" v-model="currentService.firstSongVerses"
                                    :song="currentService.firstSong" />
                            </div>

                            <!-- Second Song -->
                            <div class="space-y-4">
                                <h3 class="text-lg font-semibold">
                                    {{ t('churchService.secondSong') }}
                                </h3>
                                <SongSelector
:selected-song="currentService.secondSong"
                                    :placeholder="t('churchService.selectSecondSong')"
                                    @song-selected="(song) => selectSong(2, song)" />
                                <VerseSelector
v-if="currentService.secondSong"
                                    v-model="currentService.secondSongVerses" :song="currentService.secondSong" />
                            </div>
                        </div>

                        <!-- Service Controls -->
                        <div class="flex flex-col sm:flex-row gap-4 pt-6 border-t">
                            <Button
:disabled="!canPlayService" size="lg" class="flex items-center space-x-2"
                                @click="playService">
                                <Play class="w-5 h-5" />
                                <span>{{ t('churchService.playService') }}</span>
                            </Button>

                            <Button
:disabled="!canSaveService" variant="outline" size="lg"
                                class="flex items-center space-x-2" @click="saveService">
                                <Save class="w-5 h-5" />
                                <span>{{ t('churchService.saveService') }}</span>
                            </Button>

                            <Button
variant="outline" size="lg" class="flex items-center space-x-2"
                                @click="clearService">
                                <X class="w-5 h-5" />
                                <span>{{ t('churchService.clearService') }}</span>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <!-- Audio Player for Service -->
                <ServiceAudioPlayer
v-if="isPlayingService" :service="currentService" @song-completed="onSongCompleted"
                    @service-completed="onServiceCompleted" />

                <!-- Service History -->
                <ServiceHistory :history="serviceHistory" @load-service="loadService" @delete-service="deleteService" />
            </main>
        </ScrollArea>
    </div>
</template>

<script setup lang="ts">
import { Play, Save, X } from 'lucide-vue-next';
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

import AppHeader from '@/components/AppHeader.vue';
import ServiceAudioPlayer from '@/components/church-service/ServiceAudioPlayer.vue';
import ServiceHistory from '@/components/church-service/ServiceHistory.vue';
import SongSelector from '@/components/church-service/SongSelector.vue';
import VerseSelector from '@/components/church-service/VerseSelector.vue';

import { useChurchService } from '@/composables/useChurchService';

const { t } = useI18n();

const {
    currentService,
    serviceHistory,
    isPlayingService,
    canPlayService,
    canSaveService,
    selectSong,
    playService,
    saveService,
    clearService,
    loadService,
    deleteService,
    loadHistory,
    onSongCompleted,
    onServiceCompleted,
} = useChurchService();

onMounted(async () => {
    await loadHistory();
});
</script>
