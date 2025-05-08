import { Box, Button, Flex, Icon, Input, Text, Select, IconButton, useToast, Menu, MenuButton, MenuList, MenuItem } from "@chakra-ui/react";
import { useState, useRef, useEffect } from "react";
import { IoSend } from "react-icons/io5";
import { FaMicrophone, FaStop } from "react-icons/fa";
import { useAudioRecorder } from 'react-audio-voice-recorder';

export default function ChatLegal() {
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const toast = useToast();

    // Basic chat state
    const [ loading, setLoading ] = useState(false);
    const [ userInput, setUserInput ] = useState("");
    const [ act, setAct ] = useState(null);
    const [ messages, setMessages ] = useState([ "Hi, I am NyaySetu. I can help you with your legal queries. Ask me anything. I can talk in English and Hindi." ]);

    // Language selection state
    const [ selectedLanguage, setSelectedLanguage ] = useState("english");

    // Voice recording state
    const [ recording, setRecording ] = useState(false);
    const [ recorded, setRecorded ] = useState(false);
    const [ transcript, setTranscript ] = useState("");
    const [ recognition, setRecognition ] = useState(null);
    const [ audioBlob, setAudioBlob ] = useState(null);
    const [ sending, setSending ] = useState(false);

    // Audio recorder hook
    const {
        startRecording: startAudioRecording,
        stopRecording: stopAudioRecording,
        recordingBlob,
    } = useAudioRecorder({ audioBitsPerSecond: 128000, mimeType: 'audio/wav' });

    // Add a timeout reference to automatically stop recognition if no speech is detected
    const recognitionTimeoutRef = useRef(null);

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
            // Use the transcript as the message
            setUserInput(transcript);

            // Send the message
            addMessage(transcript);

            // Reset states
            setRecorded(false);
            setRecording(false);
            setTranscript("");

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

                // Use the transcribed text as the message
                if (responseData.question) {
                    setUserInput(responseData.question);
                    addMessage(responseData.question);
                }

                // Reset states
                setRecorded(false);
                setRecording(false);
                setAudioBlob(null);

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

    const addMessage = (input = userInput) => {
        if (!input || input.trim() === '') {
            return;
        }

        setMessages([...messages, input, "NyaySetu is Thinking..."])
        setUserInput("")
        setLoading(true)
        // const base = 'https://nyaysathi.replit.app/';
        const base = 'http://localhost:5000/'
        if (messages.length === 1) {
            const endpoint = base + 'ask';
            const requestData = {
                question: input,
                lang: selectedLanguage
            };
            fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
            }).then(response => {
                if (!response.ok) {
                    throw new Error(`Error: ${response.status} - ${response.statusText}`);
                }
                return response.json();
            }).then(responseData => {
                console.log(responseData);
                if (responseData.error) {
                    throw new Error(responseData.error);
                }
                setAct(responseData.act)
                setMessages([...messages, userInput, responseData.answer])
                setLoading(false)
            }).catch(error => {
                console.error('Error:', error.message);
                setMessages([...messages.slice(0, -1), "Sorry, I encountered an error. Please try again."])
                setLoading(false)
            });
        }
        else {
            const endpoint = base + 'chat';
            const requestData = {
                act: act,
                question: input,
                context: messages[messages.length - 3],
                lang: selectedLanguage
            };
            fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
            }).then(response => {
                if (!response.ok) {
                    throw new Error(`Error: ${response.status} - ${response.statusText}`);
                }
                return response.json();
            }).then(responseData => {
                console.log(responseData);
                if (responseData.error) {
                    throw new Error(responseData.error);
                }
                setMessages([...messages, userInput, responseData.answer])
                setLoading(false)
            }).catch(error => {
                console.error('Error:', error.message);
                setMessages([...messages.slice(0, -1), "Sorry, I encountered an error. Please try again."])
                setLoading(false)
            });
        }
    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [ messages ]);

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
                setUserInput(transcriptText);

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

    // Handle audio blob from recorder
    useEffect(() => {
        if (recordingBlob) {
            setAudioBlob(recordingBlob);
            setRecorded(true);
            setRecording(false);
        }
    }, [recordingBlob]);

    return (
        <Flex flexDirection={"column"} gap={3} paddingBottom={"65px"}>
            {messages.map((message, index) => {
                // Even indices (0, 2, 4...) are bot messages (left side)
                // Odd indices (1, 3, 5...) are user messages (right side)
                const isUserMessage = index % 2 !== 0;

                return (
                    <Box
                        key={index}
                        padding={3}
                        rounded={10}
                        maxWidth={{ base: "90%", lg: "65%" }}
                        bg={isUserMessage ? 'gray.100' : undefined}
                        bgGradient={!isUserMessage ? 'linear(to-r, yellow.50, pink.50, purple.50)' : undefined}
                        boxShadow={"sm"}
                        alignSelf={isUserMessage ? "flex-end" : "flex-start"}
                        border={!isUserMessage ? '1px' : undefined}
                        borderColor={!isUserMessage ? 'gray.100' : undefined}
                    >
                        {message}
                    </Box>
                )
            })}

            <div ref={messagesEndRef} />

            <Flex flexDirection={"column"} gap={1} position={"fixed"} bottom={{ base: "60px", lg: 0 }} width={{ base: "calc(100% - 30px)", lg: "calc(100% - 312px)" }} marginLeft={{ base: "-10px", lg: "0" }} bg={"white"}>
                {/* Language Selection */}
                <Flex justify="flex-end" align="center" mb={1} px={2}>
                    <Select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        size="sm"
                        width="120px"
                        borderRadius="md"
                        bg="blue.50"
                        color="blue.700"
                        fontWeight="medium"
                        isDisabled={recording || loading}
                    >
                        <option value="english">English</option>
                        <option value="hindi">Hindi</option>
                        <option value="marathi">Marathi</option>
                        <option value="bengali">Bengali</option>
                    </Select>
                </Flex>

                <Flex gap={2} position={"relative"} >
                    <Input
                        placeholder={`Type your query in ${selectedLanguage}...`}
                        bg={"gray.50"}
                        focusBorderColor='yellow.400'
                        disabled={loading || recording}
                        paddingRight={12}
                        value={userInput}
                        rounded={"full"}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !loading && !recording && addMessage()}
                    />

                    {/* Voice recording button */}
                    {!recording ? (
                        <IconButton
                            icon={<FaMicrophone />}
                            variant="ghost"
                            colorScheme="blue"
                            onClick={handleStartRecording}
                            isDisabled={loading || sending}
                            aria-label={`Start recording in ${selectedLanguage}`}
                            title={`Start recording in ${selectedLanguage}`}
                            size="sm"
                            position="absolute"
                            right="40px"
                            top="5px"
                            zIndex={2}
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
                            size="sm"
                            position="absolute"
                            right="40px"
                            top="5px"
                            zIndex={2}
                            isLoading={false} // Never show loading state for stop button
                        />
                    )}

                    {/* Send button */}
                    <Button
                        colorScheme='yellow'
                        size={"sm"}
                        rounded="full"
                        position={"absolute"}
                        bottom={1}
                        right={1}
                        isLoading={loading}
                        zIndex={2}
                        onClick={() => {
                            if (recorded && !recording) {
                                handleSendVoiceMessage();
                            } else {
                                addMessage();
                            }
                        }}
                    >
                        <Icon as={IoSend} color={"gray.50"} />
                    </Button>
                </Flex>
                <Text fontSize={{ base: "2xs", lg: "sm" }} width={"100%"} textAlign={"center"} paddingBottom={{ base: 1, lg: 2 }}>NyaySetu can make mistakes. Consider checking important information.</Text>
            </Flex>
        </Flex>
    )
}