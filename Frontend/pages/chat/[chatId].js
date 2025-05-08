import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import DashBoardWrapper from "@/components/DashBoardWrapper";
import { UserAuth } from "@/lib/auth";
import {
  Box,
  Heading,
  Text,
  Flex,
  Avatar,
  Input,
  Button,
  Spinner,
  useToast,
  VStack,
  HStack,
  Divider,
  Badge,
  IconButton,
  Image,
  Link,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Progress,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Select,
} from "@chakra-ui/react";
import { ArrowBackIcon, AttachmentIcon, DownloadIcon, ExternalLinkIcon, ChevronDownIcon } from "@chakra-ui/icons";
import { getChatRoomById, sendChatMessage } from "@/lib/db";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAudioRecorder } from 'react-audio-voice-recorder';
import { FaMicrophone, FaStop } from "react-icons/fa";
import { uploadFileToStorage, generateFilePath, getFileTypeCategory } from "@/lib/storage";

export default function ChatRoom() {
  const router = useRouter();
  const { chatId } = router.query;
  const { user } = UserAuth();
  const toast = useToast();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [chatRoom, setChatRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Voice recording states
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState("english");
  const [transcript, setTranscript] = useState("");
  const [recognition, setRecognition] = useState(null);

  // Initialize audio recorder (fallback)
  const {
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    recordingBlob,
  } = useAudioRecorder({ audioBitsPerSecond: 128000, mimeType: 'audio/wav' });

  // Add a timeout reference to automatically stop recognition if no speech is detected
  const recognitionTimeoutRef = useRef(null);

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      // Use the SpeechRecognition constructor for browsers that support it
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();

      // Configure recognition
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = true; // Enable interim results for better feedback
      recognitionInstance.maxAlternatives = 1;

      // Set up event handlers
      recognitionInstance.onstart = () => {
        console.log("Speech recognition started");
        setRecording(true);
      };

      recognitionInstance.onresult = (event) => {
        // Get the latest result
        const resultIndex = event.results.length - 1;
        const transcriptText = event.results[resultIndex][0].transcript;

        console.log("Speech recognized:", transcriptText);

        // Update the transcript in real-time
        setTranscript(transcriptText);
        setMessage(transcriptText);

        // If this is a final result
        if (event.results[resultIndex].isFinal) {
          setRecorded(true);
          setRecording(false);

          // Make sure the transcript is set correctly
          setTranscript(transcriptText);

          toast({
            title: "Speech recognized",
            description: transcriptText,
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

        // Clear any timeout
        if (recognitionTimeoutRef.current) {
          clearTimeout(recognitionTimeoutRef.current);
          recognitionTimeoutRef.current = null;
        }
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

      // Clear any timeout
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
        recognitionTimeoutRef.current = null;
      }
    };
  }, [toast]);

  // Handle language change for speech recognition
  useEffect(() => {
    // Reset recording states when language changes
    setRecorded(false);
    setRecording(false);
    setTranscript("");
    setAudioBlob(null);

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

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch chat room data
  useEffect(() => {
    if (!chatId || !user) return;

    const fetchChatRoom = async () => {
      try {
        setLoading(true);
        const chatRoomData = await getChatRoomById(chatId);

        if (!chatRoomData) {
          toast({
            title: "Error",
            description: "Chat room not found.",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          router.push("/dashboard");
          return;
        }

        // Check if user is a participant
        if (chatRoomData.userId !== user.uid && chatRoomData.lawyerId !== user.uid) {
          toast({
            title: "Access Denied",
            description: "You do not have permission to access this chat room.",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          router.push("/dashboard");
          return;
        }

        setChatRoom(chatRoomData);

        // Fetch other user's data
        const otherUserId = chatRoomData.userId === user.uid ? chatRoomData.lawyerId : chatRoomData.userId;
        const userCollection = chatRoomData.userId === user.uid ? 'lawyers' : 'users';

        const otherUserRef = doc(db, userCollection, otherUserId);
        const otherUserDoc = await getDoc(otherUserRef);

        if (otherUserDoc.exists()) {
          setOtherUser(otherUserDoc.data());
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching chat room:", error);
        toast({
          title: "Error",
          description: "Failed to load chat room. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        setLoading(false);
      }
    };

    fetchChatRoom();

    // Set up real-time listener for chat messages
    if (chatId) {
      const chatRoomRef = doc(db, 'chatRooms', chatId);
      const unsubscribe = onSnapshot(chatRoomRef, (doc) => {
        if (doc.exists()) {
          setChatRoom({ id: doc.id, ...doc.data() });
        }
      });

      return () => unsubscribe();
    }
  }, [chatId, user, router, toast]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [chatRoom?.messages]);

  // Handle recording blob when available
  useEffect(() => {
    if (!recordingBlob) return;

    console.log("Recording blob received:", recordingBlob);

    // Convert the recording blob to a WAV blob
    const reader = new FileReader();
    reader.readAsArrayBuffer(recordingBlob);
    reader.onloadend = function () {
      const wavBlob = new Blob([reader.result], { type: 'audio/wav' });
      console.log("Converted to WAV blob:", wavBlob);
      setAudioBlob(wavBlob);
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
  }, [recordingBlob, toast]);

  // Handle voice recording start
  const handleStartRecording = () => {
    // Clear any existing timeout
    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
      recognitionTimeoutRef.current = null;
    }

    // Reset states
    setTranscript("");
    setRecorded(false);

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
        startAudioRecording();
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

      // Show toast
      toast({
        title: "Listening",
        description: `Speak now in ${selectedLanguage}...`,
        status: "info",
        duration: 2000,
        isClosable: true,
      });

      // Set a timeout to automatically stop recognition after 10 seconds if no speech is detected
      recognitionTimeoutRef.current = setTimeout(() => {
        if (recording && !transcript) {
          console.log("Recognition timeout - no speech detected");
          try {
            recognition.stop();
          } catch (e) {
            console.error("Error stopping recognition after timeout:", e);
          }
        }
      }, 10000);

    } catch (error) {
      console.error("Error starting recognition:", error);

      // Reset UI state
      setRecording(false);

      toast({
        title: "Error",
        description: "Could not start speech recognition. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });

      // Fallback to audio recorder if Web Speech API fails
      try {
        startAudioRecording();
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
  };

  // Handle voice recording stop
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

        // Only show toast if we have a transcript
        if (transcript) {
          toast({
            title: "Stopped listening",
            description: "Processing what you said...",
            status: "info",
            duration: 2000,
            isClosable: true,
          });
        }
      } catch (error) {
        console.error("Error stopping recognition:", error);

        // Reset UI state in case of error
        setRecording(false);

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
        stopAudioRecording();
        toast({
          title: "Recording stopped",
          description: "Processing audio...",
          status: "info",
          duration: 2000,
          isClosable: true,
        });
      } catch (error) {
        console.error("Error stopping fallback recording:", error);

        // Reset UI state in case of error
        setRecording(false);
      }
    }
  };

  // Process and send voice message
  const handleSendVoiceMessage = async () => {
    // If we have a transcript from Web Speech API, use it directly
    if (transcript && transcript.trim() !== "") {
      try {
        setSending(true);

        // Send the recognized text as a message
        const result = await sendChatMessage(chatId, user.uid, transcript);

        if (!result.success) {
          throw new Error(result.message || "Failed to send voice message");
        }

        toast({
          title: "Voice message sent",
          description: `Message: "${transcript}"`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });

        // Reset states
        setRecorded(false);
        setRecording(false);
        setTranscript("");
        setMessage(""); // Clear the message input as well
        return;
      } catch (error) {
        console.error("Error sending voice message:", error);
        toast({
          title: "Error",
          description: "Failed to send voice message. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setSending(false);
      }
      return;
    }

    // If we don't have a transcript or audio blob, show an error
    if (!audioBlob && (!transcript || transcript.trim() === "")) {
      toast({
        title: "Error",
        description: "No audio recorded. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setRecorded(false);
      setRecording(false);
      return;
    }

    // If we have an audio blob, process it
    if (audioBlob) {
      try {
        setSending(true);

        // Create form data with audio blob and language
        const formData = new FormData();
        formData.append("file", audioBlob);
        formData.append("lang", selectedLanguage);

        // Send to backend for processing
        const response = await fetch("http://127.0.0.1:5000/ask-voice", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }

        const responseData = await response.json();
        console.log("Voice response:", responseData);

        // Send the transcribed text as a message
        if (responseData.question) {
          const result = await sendChatMessage(chatId, user.uid, responseData.question);

          if (!result.success) {
            throw new Error(result.message || "Failed to send voice message");
          }

          toast({
            title: "Voice message sent",
            description: `Message: "${responseData.question}"`,
            status: "success",
            duration: 3000,
            isClosable: true,
          });
        }

        // Reset states
        setRecorded(false);
        setRecording(false);
        setAudioBlob(null);
        setMessage(""); // Clear the message input

      } catch (error) {
        console.error("Error sending voice message:", error);
        toast({
          title: "Error",
          description: "Failed to process voice message. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setSending(false);
      }
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 5MB",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target.result);
      };
      reader.readAsDataURL(file);
      onOpen(); // Open preview modal for images
    } else {
      // For non-image files, just show the file name
      setPreviewImage(null);
      handleSendFile(file);
    }
  };

  // Handle file upload and send
  const handleSendFile = async (fileToSend = null) => {
    const fileToUpload = fileToSend || selectedFile;
    if (!fileToUpload) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Generate a unique path for the file
      const filePath = generateFilePath(user.uid, fileToUpload.name);

      // Upload the file to Firebase Storage
      const downloadURL = await uploadFileToStorage(fileToUpload, filePath);

      // Determine file type category
      const fileType = getFileTypeCategory(fileToUpload.type);

      // Create file attachment object
      const fileAttachment = {
        name: fileToUpload.name,
        type: fileToUpload.type,
        size: fileToUpload.size,
        url: downloadURL,
        fileType: fileType
      };

      // Send message with file attachment
      const messageText = message.trim() || `Sent a ${fileType}`;
      const result = await sendChatMessage(chatId, user.uid, messageText, fileAttachment);

      if (!result.success) {
        toast({
          title: "Error",
          description: result.message || "Failed to send file.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Success",
          description: "File sent successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }

      // Reset states
      setMessage("");
      setSelectedFile(null);
      setPreviewImage(null);
      setUploadProgress(0);
      onClose();
    } catch (error) {
      console.error("Error sending file:", error);
      toast({
        title: "Error",
        description: "Failed to upload file. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!message.trim()) return;

    try {
      setSending(true);

      console.log("Sending message as user:", user.uid);
      console.log("Message content:", message.trim());
      console.log("Chat ID:", chatId);

      // Send the message with explicit sender ID
      const result = await sendChatMessage(chatId, user.uid, message);
      console.log("Send message result:", result);

      if (!result.success) {
        toast({
          title: "Error",
          description: result.message || "Failed to send message.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }

      setMessage("");
      setSending(false);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setSending(false);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";

    try {
      let date;

      // Handle Firestore Timestamp
      if (timestamp.seconds && timestamp.nanoseconds) {
        date = new Date(timestamp.seconds * 1000);
      }
      // Handle JavaScript Date object
      else if (timestamp instanceof Date) {
        date = timestamp;
      }
      // Handle string or number
      else {
        date = new Date(timestamp);
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.error("Invalid date:", timestamp);
        return "Invalid time";
      }

      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error("Error formatting timestamp:", error, timestamp);
      return "Invalid time";
    }
  };

  // Render message
  const renderMessage = (message, index) => {
    // SIMPLE APPROACH: If the sender ID matches the current user ID, it's MY message
    // This is the most reliable way to determine if a message is from the current user
    const isMyMessage = String(message.senderId) === String(user?.uid);
    const hasAttachment = message.hasAttachment && message.attachment;

    console.log("Message:", message);
    console.log("Sender ID:", message.senderId);
    console.log("Current user ID:", user?.uid);
    console.log("Is my message:", isMyMessage);
    console.log("Has attachment:", hasAttachment);

    // Function to render file attachment
    const renderAttachment = () => {
      if (!hasAttachment) return null;

      const { fileType, url, name } = message.attachment;

      // Render image attachment
      if (fileType === 'image') {
        return (
          <Box mb={2}>
            <Image
              src={url}
              alt={name}
              borderRadius="md"
              maxH="200px"
              objectFit="contain"
              cursor="pointer"
              onClick={() => window.open(url, '_blank')}
            />
          </Box>
        );
      }

      // Render PDF attachment
      if (fileType === 'pdf') {
        return (
          <Box
            mb={2}
            p={2}
            bg={isMyMessage ? "blue.600" : "gray.200"}
            borderRadius="md"
          >
            <Flex align="center">
              <DownloadIcon mr={2} />
              <Link
                href={url}
                isExternal
                color={isMyMessage ? "white" : "blue.500"}
                fontWeight="medium"
                fontSize="sm"
              >
                {name} <ExternalLinkIcon mx="2px" />
              </Link>
            </Flex>
          </Box>
        );
      }

      // Render other file types
      return (
        <Box
          mb={2}
          p={2}
          bg={isMyMessage ? "blue.600" : "gray.200"}
          borderRadius="md"
        >
          <Flex align="center">
            <AttachmentIcon mr={2} />
            <Link
              href={url}
              isExternal
              color={isMyMessage ? "white" : "blue.500"}
              fontWeight="medium"
              fontSize="sm"
            >
              {name} <ExternalLinkIcon mx="2px" />
            </Link>
          </Flex>
        </Box>
      );
    };

    return (
      <Flex
        key={index}
        justify={isMyMessage ? "flex-end" : "flex-start"}
        mb={3}
        position="relative"
        width="100%"
      >
        {/* Only show other person's avatar for messages NOT from me */}
        {!isMyMessage && (
          <Avatar
            size="xs"
            name={otherUser?.name}
            src={otherUser?.photoURL}
            mr={2}
            mt={1}
          />
        )}

        <Box
          maxW="70%"
          bg={isMyMessage ? "blue.500" : "gray.100"}
          color={isMyMessage ? "white" : "black"}
          p={3}
          borderRadius="lg"
          borderTopLeftRadius={!isMyMessage ? "0" : "lg"}
          borderTopRightRadius={isMyMessage ? "0" : "lg"}
          position="relative"
          boxShadow="sm"
        >
          {/* Render attachment if present */}
          {renderAttachment()}

          {/* Render message text */}
          {message.text && <Text>{message.text}</Text>}

          {/* Timestamp */}
          <Text
            fontSize="xs"
            color={isMyMessage ? "blue.100" : "gray.500"}
            textAlign="right"
            mt={1}
          >
            {formatTimestamp(message.timestamp)}
          </Text>
        </Box>

        {/* Only show my avatar for messages from me */}
        {isMyMessage && (
          <Avatar
            size="xs"
            name={user?.displayName}
            src={user?.photoURL}
            ml={2}
            mt={1}
          />
        )}
      </Flex>
    );
  };

  return (
    <DashBoardWrapper page="chat">
      <Box height="calc(100vh - 150px)" display="flex" flexDirection="column">
        {/* Chat Header */}
        <Flex
          p={3}
          bg="blue.500"
          color="white"
          borderBottom="1px solid"
          borderColor="blue.600"
          align="center"
          position="sticky"
          top={0}
          zIndex={1}
          boxShadow="0 1px 3px rgba(0,0,0,0.12)"
        >
          <IconButton
            icon={<ArrowBackIcon />}
            variant="ghost"
            mr={2}
            color="white"
            _hover={{ bg: "blue.600" }}
            onClick={() => router.back()}
            aria-label="Go back"
          />

          {loading ? (
            <Spinner size="sm" color="white" />
          ) : (
            <Flex flex={1} align="center">
              <Avatar
                size="md"
                name={otherUser?.name}
                src={otherUser?.photoURL}
                mr={3}
                border="2px solid white"
              />
              <Box>
                <Heading size="sm">{otherUser?.name || "User"}</Heading>
                <Text fontSize="xs" color="blue.100">
                  {otherUser?.email || ""}
                </Text>
                <Text fontSize="xs" color="blue.100" fontStyle="italic">
                  {chatRoom?.subject}
                </Text>
              </Box>
            </Flex>
          )}
        </Flex>

        {/* Chat Messages */}
        {loading ? (
          <Flex justify="center" align="center" flex={1}>
            <Spinner size="xl" color="yellow.500" />
          </Flex>
        ) : (
          <VStack
            flex={1}
            p={4}
            spacing={4}
            overflowY="auto"
            bg="gray.50"
            backgroundImage="url('https://i.pinimg.com/originals/97/c0/07/97c00759d90d786d9b6a5348c6f743dc.jpg')"
            backgroundSize="cover"
            backgroundPosition="center"
            align="stretch"
          >
            <Box
              flex={1}
              p={2}
              borderRadius="md"
              overflowY="auto"
            >
              {chatRoom?.messages?.length === 0 ? (
                <Flex
                  justify="center"
                  align="center"
                  height="100%"
                  bg="rgba(255, 255, 255, 0.8)"
                  borderRadius="md"
                  p={4}
                >
                  <Text color="gray.600" fontWeight="medium">
                    No messages yet. Start the conversation!
                  </Text>
                </Flex>
              ) : (
                <VStack spacing={2} align="stretch">
                  {chatRoom?.messages?.map(renderMessage)}
                </VStack>
              )}
              <div ref={messagesEndRef} />
            </Box>
          </VStack>
        )}

        {/* Language Selector */}
        <Box px={3} py={2} bg="gray.50" borderTop="1px solid" borderColor="gray.200">
          <Select
            size="sm"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            width="150px"
            colorScheme="blue"
            variant="filled"
            isDisabled={recording || sending || isUploading}
          >
            <option value="english">English</option>
            <option value="hindi">Hindi</option>
            <option value="marathi">Marathi</option>
            <option value="bengali">Bengali</option>
          </Select>
        </Box>

        {/* Message Input */}
        <HStack
          p={3}
          bg="white"
          borderTop="1px solid"
          borderColor="gray.200"
          spacing={2}
          boxShadow="0 -1px 5px rgba(0,0,0,0.05)"
        >
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.txt"
          />

          {/* Attachment button */}
          <IconButton
            icon={<AttachmentIcon />}
            variant="ghost"
            colorScheme="blue"
            onClick={() => fileInputRef.current?.click()}
            isDisabled={loading || sending || isUploading || recording}
            aria-label="Attach file"
            size="md"
          />

          {/* Language indicator */}
          <Box
            display="flex"
            alignItems="center"
            mr={1}
            px={2}
            py={1}
            bg="blue.50"
            borderRadius="md"
            fontSize="xs"
            fontWeight="medium"
            color="blue.700"
          >
            <Text>{selectedLanguage.charAt(0).toUpperCase() + selectedLanguage.slice(1)}</Text>
          </Box>

          {/* Voice recording button */}
          {!recording ? (
            <IconButton
              icon={<FaMicrophone />}
              variant="ghost"
              colorScheme="blue"
              onClick={handleStartRecording}
              isDisabled={loading || sending || isUploading}
              aria-label={`Start recording in ${selectedLanguage}`}
              title={`Start recording in ${selectedLanguage}`}
              size="md"
            />
          ) : (
            <IconButton
              icon={<FaStop />}
              variant="solid"
              colorScheme="red"
              onClick={handleStopRecording}
              isDisabled={false} // Never disable the stop button
              aria-label="Stop recording"
              title="Stop recording"
              size="md"
              isLoading={false} // Never show loading state for stop button
            />
          )}

          {/* Separate button for sending recorded voice */}
          {recorded && !recording && (
            <IconButton
              icon={<IoSend />}
              variant="solid"
              colorScheme="green"
              onClick={handleSendVoiceMessage}
              isDisabled={loading || sending || isUploading}
              aria-label="Send voice message"
              title="Send voice message"
              size="md"
            />
          )}

          <Input
            placeholder={`Type a message in ${selectedLanguage}...`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !isUploading && !recording && handleSendMessage()}
            disabled={loading || sending || isUploading || recording}
            bg="gray.50"
            borderRadius="full"
            size="md"
            _focus={{
              boxShadow: "0 0 0 1px blue.500",
              borderColor: "blue.500"
            }}
          />

          <Button
            colorScheme="blue"
            onClick={handleSendMessage}
            isLoading={sending}
            disabled={loading || (!message.trim() && !selectedFile) || isUploading || recording}
            borderRadius="full"
            size="md"
            width="80px"
            _hover={{
              bg: "blue.600"
            }}
          >
            Send
          </Button>
        </HStack>

        {/* Image Preview Modal */}
        <Modal isOpen={isOpen} onClose={onClose} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Send Image</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {previewImage && (
                <Box mb={4}>
                  <Image
                    src={previewImage}
                    alt="Preview"
                    maxH="300px"
                    mx="auto"
                    borderRadius="md"
                  />
                </Box>
              )}

              <Input
                placeholder="Add a caption (optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                mb={4}
              />

              {isUploading && (
                <Box mb={4}>
                  <Text mb={2} fontSize="sm">Uploading...</Text>
                  <Progress value={uploadProgress} size="sm" colorScheme="blue" />
                </Box>
              )}
            </ModalBody>
            <ModalFooter>
              <Button
                variant="ghost"
                mr={3}
                onClick={onClose}
                isDisabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={() => handleSendFile()}
                isLoading={isUploading}
                loadingText="Sending"
              >
                Send Image
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    </DashBoardWrapper>
  );
}
