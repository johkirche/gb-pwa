<template>
    <Card class="sticky top-4 z-10">
        <CardHeader>
            <CardTitle class="flex items-center space-x-2">
                <span>🎵</span>
                <span>{{ t('churchService.audioPlayer.title') }}</span>
            </CardTitle>
            <CardDescription>
                {{ t('churchService.audioPlayer.description') }}
            </CardDescription>
        </CardHeader>

        <CardContent class="space-y-6">
            <!-- Current Song Info -->
            <div class="bg-muted rounded-lg p-4">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="font-medium">
                        {{ currentSongTitle }}
                    </h4>
                    <Badge variant="outline">
                        {{ currentSongPosition === 0 ? t('churchService.firstSong') : t('churchService.secondSong') }}
                    </Badge>
                </div>
                <p class="text-sm text-muted-foreground">
                    {{ t('churchService.audioPlayer.playingVerses') }}: {{ currentVerses.join(', ') }}
                </p>
            </div>

            <!-- Audio Player -->
            <div v-if="currentAudioUrl" class="space-y-4">
                <SimpleAudioPlayer
:key="currentAudioUrl" :audio-url="currentAudioUrl" :title="currentSongTitle"
                    :autoplay="true" @ended="onAudioEnded" />
            </div>

            <!-- No Audio Message -->
            <div v-else class="text-center py-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle class="w-5 h-5 text-yellow-600 mx-auto mb-2" />
                <p class="text-sm text-yellow-800">
                    {{ t('churchService.audioPlayer.noAudio') }}
                </p>
            </div>

            <!-- Service Controls -->
            <div class="flex items-center justify-center pt-4 border-t">
                <Button variant="destructive" size="sm" @click="stopService">
                    <Square class="w-4 h-4 mr-1" />
                    {{ t('churchService.audioPlayer.stop') }}
                </Button>
            </div>
        </CardContent>
    </Card>
</template>

<script setup lang="ts">
import { AlertTriangle, Square } from 'lucide-vue-next';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import SimpleAudioPlayer from '@/components/song/SimpleAudioPlayer.vue';

import type { ChurchService } from '@/composables/useChurchService';
import type { Gesangbuchlied } from '@/gql/graphql';

interface Props {
    service: ChurchService;
    currentSongPosition?: number;
}

const props = withDefaults(defineProps<Props>(), {
    currentSongPosition: 0,
});

const emit = defineEmits<{
    songCompleted: [];
    serviceCompleted: [];
    songChanged: [position: number];
    serviceStopped: [];
}>();

const { t } = useI18n();

const currentSong = computed((): Gesangbuchlied | null => {
    if (props.currentSongPosition === 0) {
        return props.service.firstSong;
    } else if (props.currentSongPosition === 1) {
        return props.service.secondSong;
    }
    return null;
});

const currentVerses = computed((): number[] => {
    if (props.currentSongPosition === 0) {
        return props.service.firstSongVerses;
    } else if (props.currentSongPosition === 1) {
        return props.service.secondSongVerses;
    }
    return [];
});

const currentSongTitle = computed((): string => {
    return currentSong.value?.titel || t('utils.unknown');
});

const currentAudioUrl = computed((): string | null => {
    if (!currentSong.value) return null;

    // Get first available audio file
    const audioFiles = currentSong.value.melodieId?.noten?.filter(note =>
        note?.directus_files_id?.type?.includes('audio')
    ) || [];

    if (audioFiles.length === 0) return null;

    const directusUrl = import.meta.env.VITE_PUBLIC_DIRECTUS_URL;
    const firstAudioFile = audioFiles[0];

    return firstAudioFile?.directus_files_id?.id
        ? `${directusUrl}/assets/${firstAudioFile.directus_files_id.id}`
        : null;
});

const onAudioEnded = () => {
    emit('songCompleted');
};

const stopService = () => {
    emit('serviceStopped');
};
</script>
