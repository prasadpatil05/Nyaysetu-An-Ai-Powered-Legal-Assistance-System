import {
  Button, Divider,
  Flex,
  Icon,
  Text,
  Textarea,
  Stack,
  Badge,
  Box,
  SimpleGrid,
  Avatar,
  useToast,
  Select,
  HStack,
  Radio,
  RadioGroup
} from "@chakra-ui/react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { IoSend } from "react-icons/io5";
import { IoMdThumbsUp, IoMdThumbsDown } from "react-icons/io";
import { FaMicrophone, FaStop, FaVolumeUp } from "react-icons/fa";
import { useAudioRecorder } from 'react-audio-voice-recorder';
import { UserAuth } from "@/lib/auth";
import { getLawyer, saveQuery } from "@/lib/db";

export default function AskQuery() {
  const audioRef = useRef(null);
  const { user } = UserAuth();
  const [loading, setLoading] = useState(false);
  const [userInput, setUserInput] = useState(""); // Initialize with empty string instead of null
  const [apiOutput, setApiOutput] = useState("");
  const [specs, setSpecs] = useState([]);
  const [sourceDocs, setSourceDocs] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [idk, setIdk] = useState(false);
  const [hit, setHit] = useState(true);
  const [precision, setPrecision] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [audio, setAudio] = useState(null);
  const [blob, setBlob] = useState(null);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("english"); // Default language is English
  const {
    startRecording,
    stopRecording,
    recordingBlob,
  } = useAudioRecorder({ audioBitsPerSecond: 128000, mimeType: 'audio/wav' });
  const toast = useToast();

  // Web Speech API recognition
  const [recognition, setRecognition] = useState(null);
  const [transcript, setTranscript] = useState("");

  // Initialize speech recognition and synthesis on component mount
  useEffect(() => {
    // Check for speech synthesis support
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      console.log("Speech synthesis is supported in this browser");

      // Get available voices
      const voices = window.speechSynthesis.getVoices();
      console.log("Available voices:", voices);

      // Some browsers need this event to get voices
      window.speechSynthesis.onvoiceschanged = () => {
        const updatedVoices = window.speechSynthesis.getVoices();
        console.log("Updated voices:", updatedVoices);
      };
    } else {
      console.warn("Speech synthesis is not supported in this browser");
    }

    // Initialize speech recognition
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      // Use the SpeechRecognition constructor for browsers that support it
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();

      // Configure recognition
      recognitionInstance.continuous = true; // Enable continuous recognition for longer phrases
      recognitionInstance.interimResults = true; // Enable interim results for better feedback
      recognitionInstance.maxAlternatives = 3; // Get multiple alternatives to improve accuracy

      // Set up event handlers
      recognitionInstance.onstart = () => {
        console.log("Speech recognition started");
        setRecording(true);
        setLoading(true);
      };

      recognitionInstance.onresult = (event) => {
        // Get the latest result
        const resultIndex = event.results.length - 1;

        // Get the most confident alternative
        const mostConfidentAlternative = Array.from(event.results[resultIndex])
          .sort((a, b) => b.confidence - a.confidence)[0];

        const transcriptText = mostConfidentAlternative.transcript;
        const confidence = mostConfidentAlternative.confidence;

        console.log(`Speech recognized (confidence: ${confidence.toFixed(2)}):`, transcriptText);

        // Build a complete transcript from all final results
        let completeTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            completeTranscript += event.results[i][0].transcript + " ";
          }
        }

        // For interim results, just show the current transcript
        if (!event.results[resultIndex].isFinal) {
          // Update the transcript in real-time for visual feedback
          setTranscript(transcriptText);
          setUserInput(transcriptText);
        } else {
          // For final results, use the complete transcript
          const finalTranscript = completeTranscript.trim();
          console.log("Final transcript:", finalTranscript);

          setRecorded(true);
          setRecording(false);
          setLoading(false);

          // Set the final transcript
          setTranscript(finalTranscript);
          setUserInput(finalTranscript);

          toast({
            title: "Speech recognized",
            description: finalTranscript,
            status: "success",
            duration: 3000,
            isClosable: true,
          });

          // Stop the recognition
          try {
            recognitionInstance.stop();
          } catch (e) {
            console.error("Error stopping recognition:", e);
          }
        }
      };

      recognitionInstance.onerror = (event) => {
        console.error("Speech recognition error:", event.error, event);

        // Reset UI state
        setRecording(false);
        setLoading(false);

        // Show appropriate error message based on error type
        let errorMessage = "Please try again.";

        if (event.error === 'no-speech') {
          errorMessage = "No speech detected. Please speak louder or check your microphone.";
        } else if (event.error === 'audio-capture') {
          errorMessage = "No microphone detected. Please check your microphone settings.";
        } else if (event.error === 'not-allowed') {
          errorMessage = "Microphone access denied. Please allow microphone access in your browser settings.";
        } else if (event.error === 'network') {
          errorMessage = "Network error. Please check your internet connection.";
        } else if (event.error === 'aborted') {
          // Don't show error toast for user-initiated abort
          return;
        }

        toast({
          title: "Recognition Error",
          description: `Error: ${event.error}. ${errorMessage}`,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      };

      recognitionInstance.onend = () => {
        console.log("Speech recognition ended");

        // Always reset UI state when recognition ends
        setRecording(false);
        setLoading(false);
      };

      setRecognition(recognitionInstance);
    } else {
      console.warn("Speech Recognition API not supported in this browser");

      toast({
        title: "Browser Not Supported",
        description: "Speech recognition is not supported in your browser. Please use Chrome or Edge for best results.",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
    }

    // Cleanup
    return () => {
      if (recognition) {
        try {
          recognition.abort();
        } catch (e) {
          console.error("Error aborting recognition:", e);
        }
      }
    };
  }, [toast]);

  // Handle language change
  useEffect(() => {
    // Reset recording states when language changes
    setRecorded(false);
    setRecording(false);
    setTranscript("");
    setBlob(null);

    if (recognition) {
      // Map our simplified language codes to BCP 47 language tags
      const languageMap = {
        "english": "en-US",
        "hindi": "hi-IN",
        "marathi": "mr-IN",
        "bengali": "bn-IN"
      };

      recognition.lang = languageMap[selectedLanguage] || "en-US";
      console.log(`Speech recognition language set to: ${recognition.lang}`);

      // If there's an ongoing recognition, stop it
      try {
        recognition.abort();
      } catch (e) {
        console.error("Error aborting recognition on language change:", e);
      }
    }

    // Show a toast notification about the language change
    toast({
      title: "Language Changed",
      description: `Voice input language set to ${selectedLanguage}`,
      status: "info",
      duration: 2000,
      isClosable: true,
    });
  }, [selectedLanguage, recognition, toast]);

  // Add a timeout reference to automatically stop recognition if no speech is detected
  const recognitionTimeoutRef = useRef(null);

  const handleStartRecording = async () => {
    // Clear any existing timeout
    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
      recognitionTimeoutRef.current = null;
    }

    // Reset states
    setTranscript("");
    setRecorded(false);
    setUserInput(""); // Clear any previous input

    if (!recognition) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in your browser. Please use Chrome or Edge.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });

      // Fallback to audio recorder
      try {
        startRecording();
        setRecording(true);
        toast({
          title: "Fallback Recording",
          description: "Using fallback recording method...",
          status: "info",
          duration: 2000,
          isClosable: true,
        });
      } catch (error) {
        console.error("Error starting fallback recording:", error);
        toast({
          title: "Recording Error",
          description: "Could not start recording. Please check your microphone settings.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
      return;
    }

    try {
      // First, make sure any previous recognition session is stopped
      try {
        recognition.abort();
      } catch (e) {
        // Ignore errors from aborting
      }

      // Start recording with Web Speech API
      recognition.start();

      // Set UI state
      setRecording(true);

      // Show toast with more detailed instructions
      toast({
        title: "Listening",
        description: `Speak clearly and at a normal pace in ${selectedLanguage}. Click the stop button when finished.`,
        status: "info",
        duration: 4000,
        isClosable: true,
      });

      // Set a longer timeout to automatically stop recognition after 20 seconds if no speech is detected
      // This gives users more time to formulate and speak their complete question
      recognitionTimeoutRef.current = setTimeout(() => {
        if (recording && !transcript) {
          console.log("Recognition timeout - no speech detected");
          try {
            recognition.stop();
          } catch (e) {
            console.error("Error stopping recognition after timeout:", e);
          }
        }
      }, 20000); // Increased from 10s to 20s

    } catch (error) {
      console.error("Error starting recognition:", error);

      // Reset UI state
      setRecording(false);
      setLoading(false);

      toast({
        title: "Error",
        description: "Could not start speech recognition. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });

      // Fallback to audio recorder if Web Speech API fails
      try {
        startRecording();
        setRecording(true);
        toast({
          title: "Fallback Recording",
          description: "Using fallback recording method...",
          status: "info",
          duration: 2000,
          isClosable: true,
        });
      } catch (fallbackError) {
        console.error("Error starting fallback recording:", fallbackError);
      }
    }
  }


  const processVoiceInput = async () => {
    console.log("Processing voice input with language:", selectedLanguage);

    // If we have a transcript from Web Speech API, use it directly
    if (transcript && transcript.trim() !== "") {
      console.log("Using transcript from Web Speech API:", transcript);

      try {
        setLoading(true);

        // Use the transcript as the user input
        const endpoint = "http://127.0.0.1:5000/ask";
        const requestData = {
          question: transcript,
          lang: selectedLanguage
        };

        console.log("Sending text query with language:", selectedLanguage);

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }

        const responseData = await response.json();
        console.log("Text query response:", responseData);

        if (responseData.answer.includes("I am not sure about this")) {
          setIdk(true);
        }

        setApiOutput(responseData.answer);
        setUserInput(transcript); // Use the transcript as the user input
        setSpecs(responseData.specs || []);
        setAudio(responseData.voice);
        setSourceDocs(responseData.docs || []);
        setPrecision(responseData.precision || 0);

        // Reset recording states
        setRecorded(false);
        setRecording(false);
        setTranscript("");
        setLoading(false);

        toast({
          title: "Success",
          description: `Voice input processed in ${selectedLanguage}`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });

        return;
      } catch (error) {
        console.error("Error processing voice input:", error.message);
        toast({
          title: "Error",
          description: "Failed to process voice input. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        setRecorded(false);
        setRecording(false);
        setLoading(false);
        return;
      }
    }

    // If we don't have a transcript, check for audio blob
    console.log("Audio blob:", blob);

    if (!blob) {
      toast({
        title: "Error",
        description: "No audio recorded. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setRecorded(false);
      setRecording(false);
      setLoading(false);
      return;
    }

    // Process audio blob
    const formData = new FormData();
    formData.append("file", blob);
    formData.append("lang", selectedLanguage); // Add the selected language to the request

    try {
      setLoading(true);
      const endpoint = "http://127.0.0.1:5000/ask-voice";

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} - ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log("Voice response data:", responseData);

      if (responseData.answer.includes("I am not sure about this")) {
        setIdk(true);
      }

      setApiOutput(responseData.answer);
      setUserInput(responseData.question);
      setSpecs(responseData.specs || []);
      setAudio(responseData.voice);
      setSourceDocs(responseData.docs || []);
      setPrecision(responseData.precision || 0);

      // Reset recording states
      setRecorded(false);
      setRecording(false);
      setBlob(null);
      setLoading(false);

      toast({
        title: "Success",
        description: `Voice input processed in ${selectedLanguage}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error processing voice input:", error.message);
      toast({
        title: "Error",
        description: "Failed to process voice input. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setRecorded(false);
      setRecording(false);
      setLoading(false);
    }
  }

  const handleStopRecording = () => {
    // Clear any timeout
    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
      recognitionTimeoutRef.current = null;
    }

    if (recognition && recording) {
      try {
        // Stop Web Speech API recognition
        recognition.stop();

        // Update UI immediately to provide feedback
        setRecording(false);

        // Set a small delay to allow final results to be processed
        setTimeout(() => {
          // Only show toast if we have a transcript
          if (transcript) {
            // Automatically process the voice input if we have a transcript
            processVoiceInput();

            toast({
              title: "Stopped listening",
              description: "Processing what you said...",
              status: "info",
              duration: 2000,
              isClosable: true,
            });
          } else {
            toast({
              title: "No speech detected",
              description: "Please try again and speak clearly.",
              status: "warning",
              duration: 3000,
              isClosable: true,
            });
          }
        }, 500); // Small delay to allow final results to be processed
      } catch (error) {
        console.error("Error stopping recognition:", error);

        // Reset UI state in case of error
        setRecording(false);
        setLoading(false);

        toast({
          title: "Error",
          description: "Error stopping speech recognition. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } else if (recording) {
      // Fallback to audio recorder
      try {
        stopRecording();
        setLoading(true);
        setRecorded(true); // Set recorded to true to show the process button

        toast({
          title: "Recording stopped",
          description: `Audio recorded in ${selectedLanguage}. Click the send button to process.`,
          status: "info",
          duration: 3000,
          isClosable: true,
        });
      } catch (error) {
        console.error("Error stopping fallback recording:", error);

        // Reset UI state in case of error
        setRecording(false);
        setLoading(false);
      }
    }
  }

  const askSathi = async () => {
    if (!userInput || userInput.trim() === '') {
      toast({
        title: "Error",
        description: "Please enter a question",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIdk(false);
      setLoading(true);
      const endpoint = "http://127.0.0.1:5000/ask";
      const requestData = {
        question: userInput,
        lang: selectedLanguage // Include the selected language
      };

      console.log("Sending text query with language:", selectedLanguage);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const responseData = await response.json();
      console.log("Text query response:", responseData);

      if (responseData.answer.includes("I am not sure about this")) {
        setIdk(true);
      }

      setApiOutput(responseData.answer);
      setPrecision(responseData.precision);
      setSpecs(responseData.specs);
      setAudio(responseData.voice);
      setSourceDocs(responseData.docs);

      // Save query to Firestore
      if (user) {
        const queryData = {
          question: userInput,
          answer: responseData.answer,
          docs: responseData.docs,
          precision: responseData.precision,
          specs: responseData.specs
        };

        const saved = await saveQuery(user.uid, queryData);
        if (!saved) {
          toast({
            title: "Error saving query",
            description: "Your query was processed but couldn't be saved to your history.",
            status: "warning",
            duration: 5000,
            isClosable: true,
          });
        }
      }

      setLoading(false);
    } catch (error) {
      console.error("Error:", error.message);
      toast({
        title: "Error",
        description: "There was an error processing your query. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setLoading(false);
    }
  };

  const reaskSathi = async () => {
    try {
      setIdk(false);
      setLoading(true);
      const endpoint = "http://127.0.0.1:5000/reask";
      const requestData = {
        question: userInput,
        response: apiOutput,
        docs: sourceDocs,
        lang: selectedLanguage // Include the selected language
      };

      console.log("Sending reask query with language:", selectedLanguage);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} - ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log("Reask response:", responseData);

      if (responseData.answer.includes("I am not sure about this")) {
        setIdk(true);
        setHit(false);
      }

      setApiOutput(responseData.answer);
      setPrecision(responseData.precision);
      setAudio(responseData.voice);
      setLoading(false);

      toast({
        title: "Success",
        description: `Follow-up query processed in ${selectedLanguage}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error processing follow-up query:', error.message);
      toast({
        title: "Error",
        description: "Failed to process your follow-up query. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("Specs:", specs);
    const fetchData = async () => {
      try {
        const resultLawyers = await getLawyer(specs);
        setLawyers(resultLawyers);
        console.log("Lawyers:", resultLawyers);
      } catch (error) {
        console.error("Error fetching lawyers:", error.message);
      }
    };

    fetchData();
  }, [specs, user]);

  useEffect(() => {
    if (!recordingBlob) return;

    console.log("Recording blob received:", recordingBlob);

    // Convert the recording blob to a WAV blob
    const reader = new FileReader();
    reader.readAsArrayBuffer(recordingBlob);
    reader.onloadend = function () {
      const wavBlob = new Blob([reader.result], { type: 'audio/wav' });
      console.log("Converted to WAV blob:", wavBlob);
      setBlob(wavBlob);
      setRecorded(true);
    }

    reader.onerror = function(error) {
      console.error("Error reading audio data:", error);
      toast({
        title: "Error",
        description: "Failed to process audio recording. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setRecorded(false);
    }
  }, [recordingBlob, toast])

  // Function to generate text-to-speech directly in the browser
  const generateSpeech = async (text, language) => {
    if (!text) return;

    try {
      // Use the browser's SpeechSynthesis API
      const synth = window.speechSynthesis;

      // Create a new utterance
      const utterance = new SpeechSynthesisUtterance(text);

      // Set the language based on the selected language
      const langMap = {
        'english': 'en-US',
        'hindi': 'hi-IN',
        'marathi': 'mr-IN',
        'bengali': 'bn-IN'
      };

      const langCode = langMap[language] || 'en-US';
      utterance.lang = langCode;

      // Try to find a voice that matches the language
      const voices = synth.getVoices();
      console.log(`Finding voice for language: ${langCode}`);

      // First try to find a voice that exactly matches the language code
      let voice = voices.find(v => v.lang === langCode);

      // If no exact match, try to find a voice that starts with the language code prefix
      if (!voice) {
        const langPrefix = langCode.split('-')[0];
        voice = voices.find(v => v.lang.startsWith(langPrefix));
      }

      // If we found a matching voice, use it
      if (voice) {
        console.log(`Using voice: ${voice.name} (${voice.lang})`);
        utterance.voice = voice;
      } else {
        console.log(`No matching voice found for ${langCode}, using default voice`);
      }

      // Adjust speech parameters for better quality
      utterance.rate = 1.0; // Normal speed
      utterance.pitch = 1.0; // Normal pitch
      utterance.volume = 1.0; // Full volume

      // Speak the text
      synth.cancel(); // Cancel any ongoing speech
      synth.speak(utterance);

      // Set state to indicate audio is playing
      setIsAudioLoaded(true);

      // Add event listeners
      utterance.onend = () => {
        console.log("Speech ended");
        setIsAudioLoaded(false);
      };

      utterance.onerror = (error) => {
        console.error("Speech error:", error);
        setIsAudioLoaded(false);
        toast({
          title: "Speech Error",
          description: "Failed to play speech. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      };

      return utterance;
    } catch (error) {
      console.error("Error generating speech:", error);
      toast({
        title: "Speech Error",
        description: "Your browser doesn't support speech synthesis. Please try another browser.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return null;
    }
  };

  // Handle play button click
  const handlePlaySpeech = () => {
    if (!apiOutput) return;

    generateSpeech(apiOutput, selectedLanguage);
  };

  useEffect(() => {
    // This effect handles audio playback when audio URL changes
    if (!audio) return;

    console.log("Audio URL received:", audio);

    // Create or update audio element
    const audioElement = audioRef.current;
    if (!audioElement) return;

    // Set up event listeners
    const handleCanPlay = () => {
      console.log("Audio is ready to play");
      setIsAudioLoaded(true);
      audioElement.play().catch(error => {
        console.error("Error playing audio:", error);

        // Fallback to browser speech synthesis
        if (apiOutput) {
          console.log("Falling back to browser speech synthesis");
          generateSpeech(apiOutput, selectedLanguage);
        } else {
          toast({
            title: "Audio Playback Error",
            description: "Could not play the audio response. Please check your audio settings.",
            status: "warning",
            duration: 3000,
            isClosable: true,
          });
        }
      });
    };

    const handleEnded = () => {
      console.log("Audio playback ended");
      setIsAudioLoaded(false);
    };

    const handleError = (error) => {
      console.error("Audio error:", error);
      setIsAudioLoaded(false);

      // Fallback to browser speech synthesis
      if (apiOutput) {
        console.log("Falling back to browser speech synthesis due to error");
        generateSpeech(apiOutput, selectedLanguage);
      } else {
        toast({
          title: "Audio Error",
          description: "Failed to load audio response. Using browser speech synthesis instead.",
          status: "info",
          duration: 3000,
          isClosable: true,
        });
      }
    };

    // Add event listeners
    audioElement.addEventListener('canplay', handleCanPlay);
    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('error', handleError);

    // Set the audio source
    audioElement.src = audio;
    audioElement.load();

    // Cleanup event listeners on component unmount or when audio changes
    return () => {
      audioElement.removeEventListener('canplay', handleCanPlay);
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('error', handleError);

      // Stop any ongoing speech
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [audio, apiOutput, toast, selectedLanguage]);

  return (
    <Flex flexDirection={"column"} gap={6}>
      {/* Language Selection */}
      <Box mb={2}>
        <Flex justify="space-between" align="center">
          <Text mb={2} fontWeight="medium">Select Language:</Text>
          <Box
            display="flex"
            alignItems="center"
            px={3}
            py={1}
            bg="yellow.50"
            borderRadius="md"
            fontSize="sm"
            fontWeight="medium"
            color="yellow.700"
            mb={2}
          >
            <Text>Current: {selectedLanguage.charAt(0).toUpperCase() + selectedLanguage.slice(1)}</Text>
          </Box>
        </Flex>
        <RadioGroup
          onChange={setSelectedLanguage}
          value={selectedLanguage}
          colorScheme="yellow"
        >
          <HStack spacing={4}>
            <Radio value="english">English</Radio>
            <Radio value="hindi">Hindi</Radio>
            <Radio value="marathi">Marathi</Radio>
            <Radio value="bengali">Bengali</Radio>
          </HStack>
        </RadioGroup>
      </Box>

      <Flex gap={2} position={"relative"} flexDirection="column">
        <Textarea
          placeholder={`Ask your legal queries in ${selectedLanguage}...`}
          bg={"gray.50"}
          rows={3}
          resize="none"
          focusBorderColor="yellow.400"
          disabled={loading}
          paddingRight={12}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
        />

        {/* Speech recognition feedback */}
        {recording && transcript && (
          <Box
            mt={1}
            p={2}
            bg="yellow.50"
            borderRadius="md"
            borderWidth="1px"
            borderColor="yellow.200"
            position="relative"
            zIndex={1}
          >
            <Text fontSize="sm" fontStyle="italic" color="gray.700">
              <Text as="span" fontWeight="bold">Recognizing:</Text> {transcript}
            </Text>
          </Box>
        )}

        <Button
          colorScheme="yellow"
          size={{ base: "sm", lg: "md" }}
          rounded="full"
          position={"absolute"}
          bottom={{ base: 2, lg: 3 }}
          right={{ base: 12, lg: 16 }}
          isLoading={loading}
          zIndex={2}
          onClick={askSathi}
          title="Send text query"
        >
          <Icon as={IoSend} color={"gray.50"} />
        </Button>

        {/* Microphone/Recording Button Logic */}
        {!recording ? (
          <Button
            colorScheme="yellow"
            size={{ base: "sm", lg: "md" }}
            rounded="full"
            position={"absolute"}
            bottom={{ base: 2, lg: 3 }}
            right={{ base: 2, lg: 3 }}
            isLoading={loading}
            zIndex={2}
            onClick={handleStartRecording}
            title={`Start recording in ${selectedLanguage}`}
            isDisabled={loading}
          >
            <Icon as={FaMicrophone} color={"gray.50"} />
          </Button>
        ) : (
          <Button
            colorScheme="red"
            size={{ base: "sm", lg: "md" }}
            rounded="full"
            position={"absolute"}
            bottom={{ base: 2, lg: 3 }}
            right={{ base: 2, lg: 3 }}
            isLoading={false} // Never show loading state for stop button
            zIndex={2}
            onClick={handleStopRecording}
            title="Stop recording"
            animation="pulse 1.5s infinite"
            _hover={{ bg: "red.500" }}
            sx={{
              "@keyframes pulse": {
                "0%": { boxShadow: "0 0 0 0 rgba(229, 62, 62, 0.7)" },
                "70%": { boxShadow: "0 0 0 10px rgba(229, 62, 62, 0)" },
                "100%": { boxShadow: "0 0 0 0 rgba(229, 62, 62, 0)" }
              }
            }}
          >
            <Icon as={FaStop} color={"gray.50"} />
          </Button>
        )}

        {/* Separate button for processing recorded audio */}
        {recorded && !recording && (
          <Button
            colorScheme="green"
            size={{ base: "sm", lg: "md" }}
            rounded="full"
            position={"absolute"}
            bottom={{ base: 2, lg: 3 }}
            right={{ base: 2, lg: 3 }}
            isLoading={loading}
            zIndex={2}
            onClick={processVoiceInput}
            title="Process voice recording"
          >
            <Icon as={IoSend} color={"gray.50"} />
          </Button>
        )}
      </Flex>

      <Flex
        flexDirection={"column"}
        gap={2}
        padding={6}
        rounded={10}
        boxShadow={"lg"}
        bgGradient="linear(to-r,  yellow.50, pink.50, purple.50)"
        border="1px"
        borderColor="gray.100"
      >
        {!loading && !apiOutput && (
          <Text>
            Hi, I am NyaySetu. I can help you with your legal queries. Ask me
            anything. I can understand and respond in English, Hindi, Marathi, and Bengali.
            Select your preferred language above and either type your question or use the microphone.
          </Text>
        )}
        {loading && (
          <Text fontStyle={"italic"} fontWeight={"bold"}>
            NyaySetu is Thinking...
          </Text>
        )}
        {/* Hidden audio element for playing server-generated audio */}
        <audio ref={audioRef} style={{ display: 'none' }} />

        {!loading && apiOutput && (
          <Flex flexDirection={"column"}>
            <Flex direction="column" width="100%" mb={3}>
              <Box mb={3} width="100%">
                <Button
                  leftIcon={isAudioLoaded ? <Icon as={FaStop} /> : <Icon as={FaVolumeUp} />}
                  colorScheme="yellow"
                  size="sm"
                  onClick={isAudioLoaded ?
                    () => {
                      // Stop any ongoing speech synthesis
                      window.speechSynthesis.cancel();

                      // Stop any audio element playback
                      if (audioRef.current) {
                        audioRef.current.pause();
                        audioRef.current.currentTime = 0;
                      }

                      setIsAudioLoaded(false);
                    } :
                    handlePlaySpeech
                  }
                  mb={2}
                >
                  {isAudioLoaded ? "Stop" : "Listen"}
                </Button>

                {isAudioLoaded && (
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Playing response in {selectedLanguage}
                  </Text>
                )}
              </Box>
              <Text fontWeight={"bold"}>NyaySetu</Text>
            </Flex>
            {!idk && <Text>{apiOutput}</Text>}
            {idk && (
              <Flex flexDir={"column"} gap="4">
                <Text>
                  I am still learning and very sorry to say but I do not have
                  proper knowledge to answer your question. Just to be extra
                  sure can you recheck your question.
                </Text>
                <Text>
                  I have a link to the source where you might find information
                  relevant with your query.
                </Text>
                <Link href="https://www.indiankanoon.org/" passHref={true}>
                  <Button
                    as="a"
                    colorScheme="yellow"
                    size={{ base: "sm", lg: "md" }}
                    rounded="lg"
                  >
                    Indian Kanoon
                  </Button>
                </Link>
              </Flex>
            )}
            {/* make a red note to show Hit true or false and the precision */}
            {hit ? (
              <Text color={"green"}>
                Hit: {hit.toString()} | Precision: {precision}
              </Text>
            ) : (
              <Text color={"red"}>
                Miss
              </Text>
            )}
            {lawyers && (
              <Text mt={10} fontWeight={"bold"}>
                These are some source files where we found data from, feel free
                to read them for extra knowledge! case
              </Text>
            )}
            <Stack direction={{ base: "column", lg: "row" }}>
              {!idk && sourceDocs?.length > 0 && sourceDocs.map((doc) => (
                <Link key={doc}
                  href={`https://storage.googleapis.com/nyaysathi.appspot.com/${doc}.txt`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Badge colorScheme="purple">{doc}.txt</Badge>
                </Link>
              ))}
            </Stack>
            {lawyers?.length > 0 && (
              <>
                <Text mt={10} fontWeight={"bold"}>
                  In case you need lawyers here are some we recommed based on your
                  case:
                </Text>
                <SimpleGrid columns={{ base: 1, lg: 3 }} gridGap={4} mt={4}>
                  {lawyers.map((lawyer) => (
                    <Flex
                      key={lawyer.uid}
                      direction="row"
                      align="start"
                      bg={"white"}
                      boxShadow={"lg"}
                      border="1px"
                      borderColor="gray.100"
                      p={3}
                      rounded={10}
                      gap={2}
                    >
                      <Avatar name={lawyer.name} src={lawyer.photoURL} />
                      <Flex flexDir="column">
                        <Text fontSize="lg" fontWeight="bold">
                          {lawyer.name}
                        </Text>
                        <Text color={"gray.500"} fontSize={"xs"}>{lawyer.email} | {lawyer.phone}</Text>
                        <Text color={"gray.500"} fontSize={"xs"}>Reputation Points - {lawyer.credit}</Text>
                      </Flex>
                    </Flex>
                  ))}
                </SimpleGrid>
              </>
            )}
          </Flex>
        )}
        {!loading && apiOutput && <Flex justifyContent={"center"} alignItems={"center"} gap={3}>
          <Text fontWeight={"medium"} >Are you satisfied?</Text>
          <Button size={"sm"} colorScheme={"blackAlpha"} onClick={reaskSathi}><Icon as={IoMdThumbsDown} /></Button>
        </Flex>}
      </Flex>
    </Flex>
  );
}
