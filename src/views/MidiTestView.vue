<template>
  <div class="max-w-4xl mx-auto p-6">
    <div class="bg-white rounded-lg shadow-lg p-6">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">MIDI Test Player</h1>
      
      <!-- Web MIDI API Support Check -->
      <div v-if="!webMidiSupported" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <strong>Warning:</strong> Web MIDI API is not supported in this browser. Please use Chrome, Edge, or Opera.
      </div>

      <!-- MIDI Access Request -->
      <div v-if="webMidiSupported && !midiAccess" class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
        <p class="mb-2">MIDI access is required to play files to MIDI devices.</p>
        <button @click="requestMidiAccess" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Request MIDI Access
        </button>
      </div>

      <!-- MIDI Device Selection -->
      <div v-if="midiAccess" class="mb-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-3">MIDI Output Devices</h2>
        <div v-if="midiOutputs.length === 0" class="text-gray-500 italic">
          No MIDI output devices found. Please connect a MIDI device.
        </div>
        <div v-else class="space-y-2">
          <div v-for="output in midiOutputs" :key="output.id" class="flex items-center">
            <input 
              type="radio" 
              :id="output.id" 
              :value="output.id" 
              v-model="selectedOutputId"
              class="mr-2"
            />
            <label :for="output.id" class="text-gray-700">
              {{ output.name }} ({{ output.manufacturer }})
            </label>
          </div>
        </div>
      </div>

      <!-- File Upload -->
      <div class="mb-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-3">Upload MIDI File</h2>
        <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input 
            type="file" 
            @change="handleFileUpload" 
            accept=".mid,.midi"
            class="hidden"
            ref="fileInput"
          />
          <button 
            @click="$refs.fileInput.click()"
            class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-2"
          >
            Choose MIDI File
          </button>
          <p class="text-gray-500 text-sm">or drag and drop a .mid or .midi file here</p>
          <div v-if="selectedFile" class="mt-2 text-green-600">
            Selected: {{ selectedFile.name }}
          </div>
        </div>
      </div>

      <!-- Playback Controls -->
      <div v-if="midiData && selectedOutputId" class="mb-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-3">Playback Controls</h2>
        <div class="flex items-center space-x-4">
          <button 
            @click="playMidi" 
            :disabled="isPlaying"
            class="bg-green-500 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
          >
            {{ isPlaying ? 'Playing...' : 'Play' }}
          </button>
          <button 
            @click="stopMidi" 
            :disabled="!isPlaying"
            class="bg-red-500 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
          >
            Stop
          </button>
        </div>
        <div v-if="isPlaying" class="mt-4">
          <div class="bg-gray-200 rounded-full h-2">
            <div 
              class="bg-blue-500 h-2 rounded-full transition-all duration-1000"
              :style="{ width: `${playbackProgress}%` }"
            ></div>
          </div>
          <p class="text-sm text-gray-600 mt-1">
            {{ Math.round(playbackProgress) }}% complete
          </p>
        </div>
      </div>

      <!-- MIDI File Information -->
      <div v-if="midiData" class="bg-gray-50 rounded-lg p-4">
        <h3 class="text-lg font-semibold text-gray-700 mb-2">MIDI File Information</h3>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Format:</strong> {{ midiData.format }}
          </div>
          <div>
            <strong>Tracks:</strong> {{ midiData.tracks.length }}
          </div>
          <div>
            <strong>Ticks per Quarter Note:</strong> {{ midiData.ticksPerQuarter }}
          </div>
          <div>
            <strong>Duration:</strong> {{ formatDuration(midiData.duration) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface MidiOutput {
  id: string
  name: string
  manufacturer: string
  output: WebMidi.MIDIOutput
}

interface MidiEvent {
  deltaTime: number
  type: string
  data: number[]
  absoluteTime: number
}

interface MidiTrack {
  events: MidiEvent[]
}

interface ParsedMidiData {
  format: number
  tracks: MidiTrack[]
  ticksPerQuarter: number
  duration: number
}

const webMidiSupported = ref(false)
const midiAccess = ref<WebMidi.MIDIAccess | null>(null)
const midiOutputs = ref<MidiOutput[]>([])
const selectedOutputId = ref<string>('')
const selectedFile = ref<File | null>(null)
const midiData = ref<ParsedMidiData | null>(null)
const isPlaying = ref(false)
const playbackProgress = ref(0)
const playbackTimeouts = ref<NodeJS.Timeout[]>([])

onMounted(() => {
  webMidiSupported.value = 'navigator' in window && 'requestMIDIAccess' in navigator
})

onUnmounted(() => {
  stopMidi()
})

const requestMidiAccess = async () => {
  try {
    midiAccess.value = await navigator.requestMIDIAccess()
    updateMidiOutputs()
    
    // Listen for device changes
    midiAccess.value.onstatechange = updateMidiOutputs
  } catch (error) {
    console.error('Failed to access MIDI devices:', error)
    alert('Failed to access MIDI devices. Please ensure your browser supports Web MIDI API.')
  }
}

const updateMidiOutputs = () => {
  if (!midiAccess.value) return
  
  midiOutputs.value = []
  for (const output of midiAccess.value.outputs.values()) {
    midiOutputs.value.push({
      id: output.id,
      name: output.name || 'Unknown Device',
      manufacturer: output.manufacturer || 'Unknown',
      output: output
    })
  }
  
  // Auto-select first output if available
  if (midiOutputs.value.length > 0 && !selectedOutputId.value) {
    selectedOutputId.value = midiOutputs.value[0].id
  }
}

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (file) {
    selectedFile.value = file
    parseMidiFile(file)
  }
}

const parseMidiFile = async (file: File) => {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const midiData = parseMidi(arrayBuffer)
    setMidiData(midiData)
  } catch (error) {
    console.error('Failed to parse MIDI file:', error)
    alert('Failed to parse MIDI file. Please ensure it is a valid MIDI file.')
  }
}

const parseMidi = (arrayBuffer: ArrayBuffer): ParsedMidiData => {
  const data = new Uint8Array(arrayBuffer)
  let offset = 0
  
  // Parse header
  const headerSignature = String.fromCharCode(...data.slice(0, 4))
  if (headerSignature !== 'MThd') {
    throw new Error('Invalid MIDI file: Missing header signature')
  }
  
  const headerLength = (data[4] << 24) | (data[5] << 16) | (data[6] << 8) | data[7]
  const format = (data[8] << 8) | data[9]
  const trackCount = (data[10] << 8) | data[11]
  const ticksPerQuarter = (data[12] << 8) | data[13]
  
  offset = 8 + headerLength
  
  const tracks: MidiTrack[] = []
  
  for (let i = 0; i < trackCount; i++) {
    const track = parseTrack(data, offset)
    tracks.push(track.track)
    offset = track.offset
  }
  
  const duration = calculateDuration(tracks, ticksPerQuarter)
  
  return {
    format,
    tracks,
    ticksPerQuarter,
    duration
  }
}

const parseTrack = (data: Uint8Array, offset: number) => {
  const trackSignature = String.fromCharCode(...data.slice(offset, offset + 4))
  if (trackSignature !== 'MTrk') {
    throw new Error('Invalid MIDI file: Missing track signature')
  }
  
  const trackLength = (data[offset + 4] << 24) | (data[offset + 5] << 16) | (data[offset + 6] << 8) | data[offset + 7]
  offset += 8
  
  const events: MidiEvent[] = []
  const trackEnd = offset + trackLength
  let absoluteTime = 0
  let runningStatus = 0
  
  while (offset < trackEnd) {
    const deltaTime = readVariableLength(data, offset)
    offset += deltaTime.length
    absoluteTime += deltaTime.value
    
    let eventType = data[offset]
    
    if (eventType < 0x80) {
      // Running status - reuse previous command
      eventType = runningStatus
      offset-- // Don't advance past the data byte
    } else {
      runningStatus = eventType
    }
    
    const event: MidiEvent = {
      deltaTime: deltaTime.value,
      type: getEventType(eventType),
      data: [],
      absoluteTime
    }
    
    if (eventType >= 0x80 && eventType <= 0xEF) {
      // Channel messages
      event.data.push(eventType)
      offset++
      
      const dataLength = getChannelMessageLength(eventType)
      for (let i = 0; i < dataLength; i++) {
        event.data.push(data[offset++])
      }
    } else if (eventType === 0xFF) {
      // Meta event
      offset++
      const metaType = data[offset++]
      const length = readVariableLength(data, offset)
      offset += length.length
      
      event.data.push(eventType, metaType, length.value)
      for (let i = 0; i < length.value; i++) {
        event.data.push(data[offset++])
      }
    } else if (eventType === 0xF0 || eventType === 0xF7) {
      // SysEx event
      event.data.push(eventType)
      offset++
      
      const length = readVariableLength(data, offset)
      offset += length.length
      
      for (let i = 0; i < length.value; i++) {
        event.data.push(data[offset++])
      }
    }
    
    events.push(event)
  }
  
  return {
    track: { events },
    offset
  }
}

const readVariableLength = (data: Uint8Array, offset: number) => {
  let value = 0
  let length = 0
  
  while (length < 4) {
    const byte = data[offset + length]
    value = (value << 7) | (byte & 0x7F)
    length++
    
    if ((byte & 0x80) === 0) {
      break
    }
  }
  
  return { value, length }
}

const getEventType = (eventType: number): string => {
  if (eventType >= 0x80 && eventType <= 0x8F) return 'noteOff'
  if (eventType >= 0x90 && eventType <= 0x9F) return 'noteOn'
  if (eventType >= 0xA0 && eventType <= 0xAF) return 'aftertouch'
  if (eventType >= 0xB0 && eventType <= 0xBF) return 'controlChange'
  if (eventType >= 0xC0 && eventType <= 0xCF) return 'programChange'
  if (eventType >= 0xD0 && eventType <= 0xDF) return 'channelPressure'
  if (eventType >= 0xE0 && eventType <= 0xEF) return 'pitchBend'
  if (eventType === 0xFF) return 'meta'
  if (eventType === 0xF0) return 'sysex'
  return 'unknown'
}

const getChannelMessageLength = (eventType: number): number => {
  if (eventType >= 0x80 && eventType <= 0x9F) return 2 // Note off/on
  if (eventType >= 0xA0 && eventType <= 0xBF) return 2 // Aftertouch/Control change
  if (eventType >= 0xC0 && eventType <= 0xDF) return 1 // Program change/Channel pressure
  if (eventType >= 0xE0 && eventType <= 0xEF) return 2 // Pitch bend
  return 0
}

const calculateDuration = (tracks: MidiTrack[], ticksPerQuarter: number): number => {
  let maxTime = 0
  
  for (const track of tracks) {
    let currentTime = 0
    for (const event of track.events) {
      currentTime += event.deltaTime
      if (currentTime > maxTime) {
        maxTime = currentTime
      }
    }
  }
  
  // Convert ticks to seconds (assuming 120 BPM)
  const beatsPerSecond = 120 / 60
  const secondsPerTick = 1 / (ticksPerQuarter * beatsPerSecond)
  return maxTime * secondsPerTick
}

const setMidiData = (data: ParsedMidiData) => {
  midiData.value = data
  console.log('MIDI file parsed:', data)
}

const playMidi = () => {
  if (!midiData.value || !selectedOutputId.value || isPlaying.value) return
  
  const selectedOutput = midiOutputs.value.find(output => output.id === selectedOutputId.value)
  if (!selectedOutput) return
  
  isPlaying.value = true
  playbackProgress.value = 0
  
  const startTime = performance.now()
  const duration = midiData.value.duration * 1000 // Convert to ms
  
  // Schedule all MIDI events
  const allEvents: Array<{ time: number; data: number[] }> = []
  
  for (const track of midiData.value.tracks) {
    let currentTime = 0
    
    for (const event of track.events) {
      currentTime += event.deltaTime
      
      // Convert ticks to milliseconds
      const beatsPerSecond = 120 / 60
      const msPerTick = 1000 / (midiData.value.ticksPerQuarter * beatsPerSecond)
      const eventTime = currentTime * msPerTick
      
      if (event.type === 'noteOn' || event.type === 'noteOff' || event.type === 'controlChange' || event.type === 'programChange') {
        allEvents.push({
          time: eventTime,
          data: event.data
        })
      }
    }
  }
  
  // Sort events by time
  allEvents.sort((a, b) => a.time - b.time)
  
  // Schedule playback
  allEvents.forEach(event => {
    const timeout = setTimeout(() => {
      if (isPlaying.value) {
        selectedOutput.output.send(event.data)
      }
    }, event.time)
    
    playbackTimeouts.value.push(timeout)
  })
  
  // Update progress
  const progressInterval = setInterval(() => {
    if (!isPlaying.value) {
      clearInterval(progressInterval)
      return
    }
    
    const elapsed = performance.now() - startTime
    playbackProgress.value = Math.min((elapsed / duration) * 100, 100)
    
    if (playbackProgress.value >= 100) {
      stopMidi()
    }
  }, 100)
  
  // Auto-stop after duration
  const stopTimeout = setTimeout(() => {
    stopMidi()
  }, duration + 1000)
  
  playbackTimeouts.value.push(stopTimeout)
}

const stopMidi = () => {
  isPlaying.value = false
  playbackProgress.value = 0
  
  // Clear all timeouts
  playbackTimeouts.value.forEach(timeout => clearTimeout(timeout))
  playbackTimeouts.value = []
  
  // Send all notes off to prevent stuck notes
  if (selectedOutputId.value) {
    const selectedOutput = midiOutputs.value.find(output => output.id === selectedOutputId.value)
    if (selectedOutput) {
      for (let channel = 0; channel < 16; channel++) {
        selectedOutput.output.send([0xB0 + channel, 123, 0]) // All notes off
      }
    }
  }
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<style scoped>
/* Add any additional styles here */
</style> 