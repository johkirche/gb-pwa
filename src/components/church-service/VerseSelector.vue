<template>
    <div class="space-y-4">
        <div class="flex items-center justify-between">
            <h4 class="text-sm font-medium">{{ t('churchService.selectVerses') }}</h4>
            <div class="flex items-center space-x-2">
                <Button variant="outline" size="sm" @click="selectAllVerses">
                    {{ t('churchService.selectAll') }}
                </Button>
                <Button variant="outline" size="sm" @click="clearAllVerses">
                    {{ t('churchService.clearAll') }}
                </Button>
            </div>
        </div>

        <!-- Verse Selection Grid -->
        <div class="border rounded-lg p-4">
            <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                <div
v-for="verseNumber in availableVerses" :key="verseNumber" :class="[
                    'relative flex items-center justify-center w-10 h-10 rounded-lg border-2 cursor-pointer transition-all',
                    isVerseSelected(verseNumber)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted hover:border-primary/50 hover:bg-accent'
                ]" @click="toggleVerse(verseNumber)">
                    <span class="text-sm font-medium">{{ verseNumber }}</span>
                    <CheckCircle
v-if="isVerseSelected(verseNumber)"
                        class="absolute -top-1 -right-1 w-4 h-4 text-primary-foreground" />
                </div>
            </div>

            <!-- Verse Preview -->
            <div v-if="selectedVerses.length > 0" class="mt-4 pt-4 border-t">
                <h5 class="text-sm font-medium mb-2">{{ t('churchService.selectedVerses') }}:</h5>
                <div class="flex flex-wrap gap-1">
                    <Badge v-for="verse in sortedSelectedVerses" :key="verse" variant="secondary">
                        {{ t('churchService.verse') }} {{ verse }}
                    </Badge>
                </div>
            </div>

            <!-- Verse Text Preview -->
            <div v-if="previewText && selectedVerses.length > 0" class="mt-4 pt-4 border-t">
                <h5 class="text-sm font-medium mb-2">{{ t('churchService.preview') }}:</h5>
                <ScrollArea class="max-h-32">
                    <div class="text-sm text-muted-foreground space-y-2">
                        <div v-for="verse in sortedSelectedVerses" :key="verse">
                            <span class="font-medium">{{ verse }}.</span>
                            {{ getVerseText(verse) }}
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { CheckCircle } from 'lucide-vue-next';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

import type { Gesangbuchlied } from '@/gql/graphql';

interface Props {
    song: Gesangbuchlied;
    modelValue: number[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
    'update:modelValue': [verses: number[]];
}>();

const { t } = useI18n();

const selectedVerses = computed({
    get: () => props.modelValue,
    set: (value: number[]) => emit('update:modelValue', value)
});

const sortedSelectedVerses = computed(() => {
    return [...selectedVerses.value].sort((a, b) => a - b);
});

const availableVerses = computed(() => {
    const verses: number[] = [];

    if (props.song.textId?.strophenEinzeln && Array.isArray(props.song.textId.strophenEinzeln)) {
        // Count actual verses from strophenEinzeln
        verses.push(...props.song.textId.strophenEinzeln.map((_, index) => index + 1));
    } else {
        // Default to 6 verses if we can't determine
        verses.push(1, 2, 3, 4, 5, 6);
    }

    return verses;
});

const previewText = computed(() => {
    return props.song.textId?.strophenEinzeln && Array.isArray(props.song.textId.strophenEinzeln);
});

const isVerseSelected = (verseNumber: number): boolean => {
    return selectedVerses.value.includes(verseNumber);
};

const toggleVerse = (verseNumber: number) => {
    const currentSelection = [...selectedVerses.value];
    const index = currentSelection.indexOf(verseNumber);

    if (index > -1) {
        currentSelection.splice(index, 1);
    } else {
        currentSelection.push(verseNumber);
    }

    selectedVerses.value = currentSelection;
};

const selectAllVerses = () => {
    selectedVerses.value = [...availableVerses.value];
};

const clearAllVerses = () => {
    selectedVerses.value = [];
};

const getVerseText = (verseNumber: number): string => {
    if (!props.song.textId?.strophenEinzeln || !Array.isArray(props.song.textId.strophenEinzeln)) {
        return '';
    }

    const verse = props.song.textId.strophenEinzeln[verseNumber - 1];
    if (verse && typeof verse === 'object' && 'strophe' in verse) {
        const stropheText = (verse as { strophe?: string }).strophe;
        return stropheText ? stropheText.slice(0, 100) + (stropheText.length > 100 ? '...' : '') : '';
    }

    return '';
};
</script>
