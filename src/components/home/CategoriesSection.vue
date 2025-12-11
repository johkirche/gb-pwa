<template>
  <Card>
    <CardHeader>
      <div class="flex flex-col md:flex-row justify-between gap-2">
        <div>
          <CardTitle class="mb-2">{{ t("home.categories.title") }}</CardTitle>
          <CardDescription>{{ t("home.categories.description") }}</CardDescription>
        </div>
        <!-- Sort Options and Enlarge Button -->
        <div class="mb-4 flex items-center gap-2">
          <Label class="text-sm font-medium">{{ t("home.categories.sortBy") }}:</Label>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="outline" size="sm" class="gap-2">
                <span class="text-xs">{{ getSortLabel(currentSort) }}</span>
                <ChevronDown class="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem @click="setSortType('alphabetical')">
                <span class="mr-2">🔤</span>
                {{ t("home.categories.sortAlphabetical") }}
              </DropdownMenuItem>
              <DropdownMenuItem @click="setSortType('count')">
                <span class="mr-2">🔢</span>
                {{ t("home.categories.sortByCount") }}
              </DropdownMenuItem>
              <DropdownMenuItem @click="setSortType('custom')">
                <span class="mr-2">🎯</span>
                {{ t("home.categories.sortCustom") }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <!-- Reset custom order button -->
          <Button
            v-if="currentSort === 'custom'"
            variant="ghost"
            size="sm"
            class="text-xs"
            @click="resetCustomOrder"
          >
            {{ t("home.categories.resetOrder") }}
          </Button>

          <!-- Enlarge/Shrink button -->
          <Button
            variant="ghost"
            size="sm"
            :title="isEnlarged ? t('home.categories.shrink') : t('home.categories.enlarge')"
            @click="toggleEnlarge"
          >
            <Maximize2 v-if="!isEnlarged" class="h-4 w-4" />
            <Minimize2 v-else class="h-4 w-4" />
            <span class="sr-only">
              {{ isEnlarged ? t("home.categories.shrink") : t("home.categories.enlarge") }}
            </span>
          </Button>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <ScrollArea
        :class="['transition-all duration-300 ease-in-out', isEnlarged ? 'h-[600px]' : 'h-[300px]']"
      >
        <!-- Non-draggable grids for alphabetical and count sorting -->
        <div
          v-if="currentSort !== 'custom'"
          class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          <Button
            v-for="category in sortedCategories"
            :key="category.id"
            variant="outline"
            class="h-auto p-4 flex flex-col items-center space-y-2 transition-all duration-200"
            @click="handleCategoryClick(category)"
          >
            <span class="text-2xl">{{ getCategoryIcon(category.id) }}</span>
            <span class="text-sm text-center">{{ category.name }}</span>
            <Badge variant="secondary" class="text-xs">{{ category.count }}</Badge>
          </Button>
        </div>

        <!-- Draggable grid for custom sorting -->
        <VueDraggable
          v-else
          v-model="draggableCategories"
          class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          :animation="200"
          :ghost-class="'opacity-50'"
          :chosen-class="'scale-105'"
          :drag-class="'rotate-2'"
          handle=".drag-handle"
          @end="onDragEnd"
        >
          <template #item="{ element: category }">
            <Button
              :key="category.id"
              variant="outline"
              class="relative h-auto p-4 flex flex-col items-center space-y-2 transition-all duration-200 cursor-move"
              @click="handleCategoryClick(category)"
            >
              <!-- Drag handle for custom sort -->
              <div
                class="drag-handle absolute top-2 right-2 text-gray-400 cursor-move hover:text-gray-600"
              >
                <GripVertical class="h-4 w-4" />
              </div>

              <span class="text-2xl">{{ getCategoryIcon(category.id) }}</span>
              <span class="text-sm text-center">{{ category.name }}</span>
              <Badge variant="secondary" class="text-xs">{{ category.count }}</Badge>
            </Button>
          </template>
        </VueDraggable>
      </ScrollArea>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import ScrollArea from "../ui/scroll-area/ScrollArea.vue";
import { type CategoryWithCount, useStatsStore } from "@/stores/stats";
import { ChevronDown, GripVertical, Maximize2, Minimize2 } from "lucide-vue-next";

import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import VueDraggable from "vuedraggable";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";

type SortType = "alphabetical" | "count" | "custom";

const { t } = useI18n();
const router = useRouter();
const statsStore = useStatsStore();

// Sorting state
const currentSort = ref<SortType>("alphabetical");
const customOrder = ref<string[]>([]);

// Enlarge state
const isEnlarged = ref(false);

// Load categories and restore sort preferences on component mount
onMounted(async () => {
  await statsStore.loadCategories();

  // Restore sort preferences from localStorage
  const savedSort = localStorage.getItem("categories-sort-type") as SortType;
  const savedCustomOrder = localStorage.getItem("categories-custom-order");

  if (savedSort) {
    currentSort.value = savedSort;
  }

  if (savedCustomOrder) {
    try {
      customOrder.value = JSON.parse(savedCustomOrder);
    } catch (e) {
      console.warn("Failed to parse saved custom order:", e);
    }
  }

  // Initialize custom order if needed
  if (currentSort.value === "custom" && customOrder.value.length === 0) {
    initializeCustomOrder();
    saveCustomOrder();
  }
});

// Initialize custom order when categories are loaded
const initializeCustomOrder = () => {
  if (customOrder.value.length === 0 && statsStore.categories.length > 0) {
    customOrder.value = [...statsStore.categories]
      .filter((cat) => cat.count > 0)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((cat) => cat.id);
  }
};

// Save custom order to localStorage
const saveCustomOrder = () => {
  localStorage.setItem("categories-custom-order", JSON.stringify(customOrder.value));
};

// Computed sorted categories for non-draggable modes
const sortedCategories = computed(() => {
  if (!statsStore.categories.length) return [];

  const categories = [...statsStore.categories].filter((cat) => cat.count > 0);

  if (categories.length === 0) return statsStore.categories;

  switch (currentSort.value) {
    case "alphabetical":
      return [...categories].sort((a, b) => a.name.localeCompare(b.name));

    case "count":
      return [...categories].sort((a, b) => b.count - a.count);

    default:
      return categories;
  }
});

// Computed draggable categories for custom sorting mode
const draggableCategories = computed({
  get() {
    if (currentSort.value !== "custom" || !statsStore.categories.length) {
      return [];
    }

    // Ensure custom order is initialized
    if (customOrder.value.length === 0) {
      initializeCustomOrder();
    }

    // Sort according to custom order, but only include categories with count > 0
    return [...statsStore.categories]
      .filter((cat) => cat.count > 0)
      .sort((a, b) => {
        const indexA = customOrder.value.indexOf(a.id);
        const indexB = customOrder.value.indexOf(b.id);

        // If not in custom order, put at end
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;

        return indexA - indexB;
      });
  },
  set(newOrder: CategoryWithCount[]) {
    // Update custom order based on new dragged order
    customOrder.value = newOrder.map((category) => category.id);
    saveCustomOrder();
  },
});

// Sort type handlers
const setSortType = (sortType: SortType) => {
  currentSort.value = sortType;
  localStorage.setItem("categories-sort-type", sortType);

  // Initialize custom order if switching to custom for the first time
  if (sortType === "custom" && customOrder.value.length === 0) {
    initializeCustomOrder();
    saveCustomOrder();
  }
};

const getSortLabel = (sortType: SortType): string => {
  const labels = {
    alphabetical: t("home.categories.sortAlphabetical"),
    count: t("home.categories.sortByCount"),
    custom: t("home.categories.sortCustom"),
  };
  return labels[sortType] || labels.alphabetical;
};

const resetCustomOrder = () => {
  customOrder.value = [...statsStore.categories]
    .filter((cat) => cat.count > 0)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((cat) => cat.id);
  saveCustomOrder();
};

// Enlarge toggle handler
const toggleEnlarge = () => {
  isEnlarged.value = !isEnlarged.value;
};

// Handle drag end event
const onDragEnd = () => {
  // The draggableCategories computed setter will automatically handle the reordering
  // and save to localStorage
};

// Navigate to songs list with category filter
const handleCategoryClick = (category: CategoryWithCount) => {
  router.push({
    name: "songs",
    query: {
      category: category.id,
      categoryName: category.name,
    },
  });
};

// Get icon for category based on name
const getCategoryIcon = (id: string): string => {
  const iconMap: Record<string, string> = {
    "1": "👶", // Kinder
    "2": "🧑‍🤝‍🧑", // Jugend
    "3": "🎄", // Heiligabend / Weihnachten
    "4": "🕊️", // Sakrament des Sterbens / Abschiedsfeier
    "5": "🌙", // Abendlied
    "6": "🕯️", // Advent
    "7": "🍞", // Sakrament des Abendmahls
    "8": "🎂", // Joseph Weißenberg – Geburtstag
    "9": "🌿", // Palmsonntag
    "10": "✝️", // Karfreitag
    "11": "🐣", // Ostersonntag
    "12": "⛪", // Kirchentag
    "13": "🎊", // Jahreswechsel
    "14": "💧", // Sakrament der Taufe
    "15": "🤝", // Konfirmation
    "16": "💒", // Trauung
    "17": "📜", // Verpflichtung
    "18": "👫", // Freundschaft
    "19": "🏛️", // Friedensstadt
    "20": "⚖️", // Joseph Weißenberg – Verurteilung
    "21": "🌅", // Joseph Weißenberg – Heimgang
    "22": "🕊️", // Pfingsten
    "23": "🌾", // Erntedank
    "24": "🕯️", // Ewigkeitssonntag (Totensonntag)
    "25": "💔", // Passion
    "26": "👥", // Gemeinschaft / Miteinander
    "27": "🙏", // Loblied
    "28": "🤫", // Stille
    "29": "☁️", // Christi Himmelfahrt
    "30": "🤝", // Einigkeit
    "31": "🌉", // Überbrückung
    "32": "📖", // Bekenntnistag
    "33": "🎈", // Geburtstag
    "34": "🕊️", // Frieden
    "35": "💪", // Dennoch
    "36": "👋", // Abschied
    "37": "🤗", // Trost
    "38": "🛡️", // Vertrauen
    "39": "🎼", // Kanon
    "40": "🌍", // Andere Sprache
    "41": "⚒️", // Arbeit und Beruf
    "42": "🛋️", // Rast
    "43": "🙌", // Danklied
    "44": "👣", // Nachfolge
    "45": "🔄", // Reformation / Erneuerung
    "46": "📖", // Gottes Wort
    "47": "✨", // Segen
    "48": "🌅", // Morgenlied
    "49": "🌈", // Zuversicht / Hoffnung
    "50": "⚓", // Glaubenstreue
    "51": "⛪", // Gottesdienst
    "52": "🛡️", // Schutz/Geleit/Kraft/Hilfe
    "53": "😊", // Lebensfreude / Lebensmut
    "54": "🌳", // Schöpfung / Natur
    "55": "☀️", // Sommer
    "56": "🌸", // Frühling
    "57": "♾️", // Ewigkeit
    "58": "🏗️", // Bauen
    "59": "✝️", // Bekenntnis / Glaube
    "60": "⏰", // Zeit / Lebenszeit
    "61": "🙇", // Demut
    "62": "❤️", // Gottes Liebe / Gott ist Liebe
    "63": "🏠", // Gastfreundschaft
  };
  return iconMap[id] || "🎵";
};
</script>

<style scoped>
/* VueDraggable automatically handles drag states, no custom CSS needed */
</style>
