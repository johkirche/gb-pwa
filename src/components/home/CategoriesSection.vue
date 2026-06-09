<template>
  <section>
    <!-- Section header -->
    <div class="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div>
        <h2 class="text-lg font-semibold tracking-tight">{{ t("home.categoriesHeading") }}</h2>
        <p class="text-sm text-muted-foreground mt-0.5">{{ t("home.categories.description") }}</p>
      </div>
      <!-- Sort + enlarge controls -->
      <div class="flex items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="sm" class="gap-1.5 text-muted-foreground">
              <ArrowDownUp class="h-3.5 w-3.5" />
              <span class="text-xs">{{ getSortLabel(currentSort) }}</span>
              <ChevronDown class="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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

        <Button
          v-if="currentSort === 'custom'"
          variant="ghost"
          size="sm"
          class="text-xs text-muted-foreground"
          @click="resetCustomOrder"
        >
          {{ t("home.categories.resetOrder") }}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          class="text-muted-foreground"
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

    <div ref="scrollWrapperRef" class="relative">
      <ScrollArea
        :class="['transition-all duration-300 ease-in-out', isEnlarged ? 'h-[560px]' : 'h-[268px]']"
      >
        <!-- Non-draggable chip cloud for alphabetical and count sorting -->
        <div v-if="currentSort !== 'custom'" class="flex flex-wrap gap-2 pr-3">
          <button
            v-for="category in sortedCategories"
            :key="category.id"
            class="group inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm transition-colors hover:border-primary/40 hover:bg-accent"
            @click="handleCategoryClick(category)"
          >
            <span class="text-base leading-none">{{ getCategoryIcon(category.id) }}</span>
            <span class="font-medium">{{ category.name }}</span>
            <span class="tabular-nums text-xs text-muted-foreground">{{ category.count }}</span>
          </button>
        </div>

        <!-- Draggable chip cloud for custom sorting -->
        <VueDraggable
          v-else
          v-model="draggableCategories"
          class="flex flex-wrap gap-2 pr-3"
          :animation="200"
          :ghost-class="'opacity-50'"
          :chosen-class="'scale-105'"
          handle=".drag-handle"
          @end="onDragEnd"
        >
          <template #item="{ element: category }">
            <button
              :key="category.id"
              class="group inline-flex items-center gap-2 rounded-full border bg-card pl-1.5 pr-3 py-1.5 text-sm transition-colors hover:border-primary/40 hover:bg-accent"
              @click="handleCategoryClick(category)"
            >
              <span
                class="drag-handle cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
              >
                <GripVertical class="h-4 w-4" />
              </span>
              <span class="text-base leading-none">{{ getCategoryIcon(category.id) }}</span>
              <span class="font-medium">{{ category.name }}</span>
              <span class="tabular-nums text-xs text-muted-foreground">{{ category.count }}</span>
            </button>
          </template>
        </VueDraggable>
      </ScrollArea>

      <!-- Fade hint at the top, shown once scrolled away from the start -->
      <div
        class="pointer-events-none absolute inset-x-0 top-0 h-8 rounded-t-[inherit] bg-gradient-to-b from-background to-transparent transition-opacity duration-200"
        :class="showTopFade ? 'opacity-100' : 'opacity-0'"
      />
      <!-- Fade hint at the bottom, shown while there is more to scroll -->
      <div
        class="pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-[inherit] bg-gradient-to-t from-background to-transparent transition-opacity duration-200"
        :class="showBottomFade ? 'opacity-100' : 'opacity-0'"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import ScrollArea from "../ui/scroll-area/ScrollArea.vue";
import { type CategoryWithCount, useStatsStore } from "@/stores/stats";
import { ArrowDownUp, ChevronDown, GripVertical, Maximize2, Minimize2 } from "lucide-vue-next";

import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import VueDraggable from "vuedraggable";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SortType = "alphabetical" | "count" | "custom";

const { t } = useI18n();
const router = useRouter();
const statsStore = useStatsStore();

// Sorting state
const currentSort = ref<SortType>("alphabetical");
const customOrder = ref<string[]>([]);

// Enlarge state
const isEnlarged = ref(false);

// Scroll fade indicators — show a gradient when there is more content above/below
const scrollWrapperRef = ref<HTMLElement | null>(null);
const showTopFade = ref(false);
const showBottomFade = ref(false);

let viewportEl: HTMLElement | null = null;
let resizeObserver: ResizeObserver | null = null;

const updateScrollFades = () => {
  if (!viewportEl) return;
  const { scrollTop, scrollHeight, clientHeight } = viewportEl;
  showTopFade.value = scrollTop > 1;
  showBottomFade.value = Math.ceil(scrollTop + clientHeight) < scrollHeight - 1;
};

// Observe the viewport (height changes on enlarge) and its content (reflow on
// load / sort switch), re-attaching to the content node when it gets swapped.
const reobserveContent = () => {
  if (!resizeObserver || !viewportEl) return;
  resizeObserver.disconnect();
  resizeObserver.observe(viewportEl);
  const content = viewportEl.firstElementChild;
  if (content) resizeObserver.observe(content);
  updateScrollFades();
};

const setupScrollFades = () => {
  viewportEl =
    scrollWrapperRef.value?.querySelector<HTMLElement>("[data-reka-scroll-area-viewport]") ?? null;
  if (!viewportEl) return;

  viewportEl.addEventListener("scroll", updateScrollFades, { passive: true });
  resizeObserver = new ResizeObserver(() => updateScrollFades());
  reobserveContent();
};

// The content node is replaced when toggling between the draggable / static
// chip clouds, so re-point the observer once the new DOM has rendered.
watch(
  () => [currentSort.value, statsStore.categories.length],
  () => nextTick(reobserveContent),
);

onBeforeUnmount(() => {
  viewportEl?.removeEventListener("scroll", updateScrollFades);
  resizeObserver?.disconnect();
});

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

  // Wait for the chips to render before measuring the scroll viewport
  await nextTick();
  setupScrollFades();
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
