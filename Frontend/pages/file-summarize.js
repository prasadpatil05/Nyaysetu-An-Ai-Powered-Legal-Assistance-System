import { useState, useRef, useEffect } from 'react';
import DashBoardWrapper from '@/components/DashBoardWrapper';
import { Box, Button, Flex, Heading, Icon, Text, Select, Spinner, useToast } from '@chakra-ui/react';
import Files from 'react-files';
import { RxCross2 } from "react-icons/rx";
import { FaVolumeUp, FaStop } from "react-icons/fa";

export default function FileSummarize() {
    const audioRef = useRef(null);
    const [file, setFile] = useState(null);
    const [summary, setSummary] = useState();
    const [selectedLanguage, setSelectedLanguage] = useState("english");
    const [loading, setLoading] = useState(false);
    const [audio, setAudio] = useState(null)
    const [precision, setPrecision] = useState(null);
    const [ratio, setRatio] = useState(null);
    const [isAudioLoaded, setIsAudioLoaded] = useState(false);
    const [isAudioError, setIsAudioError] = useState(false);
    const toast = useToast();

    useEffect(() => {
        const audioElement = audioRef.current;

        const handleCanPlay = () => {
            setIsAudioLoaded(true);
            setIsAudioError(false);
        };

        const handleError = (error) => {
            console.error("Audio error:", error);
            setIsAudioError(true);
            setIsAudioLoaded(false);

            // Show toast with helpful message
            toast({
                title: "Audio Playback Error",
                description: `There was an issue playing the audio in ${selectedLanguage}. Please try refreshing the page or using a different browser.`,
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        };

        const handleEnded = () => {
            setIsAudioLoaded(false);
        };

        if (audioElement) {
            audioElement.addEventListener('canplay', handleCanPlay);
            audioElement.addEventListener('error', handleError);
            audioElement.addEventListener('ended', handleEnded);

            // Try to load the audio if it exists
            if (audio) {
                // Force reload the audio element
                audioElement.load();
            }

            // Cleanup event listener on component unmount
            return () => {
                audioElement.removeEventListener('canplay', handleCanPlay);
                audioElement.removeEventListener('error', handleError);
                audioElement.removeEventListener('ended', handleEnded);
            };
        }
    }, [audio, selectedLanguage, toast]);

    function RemoveFile() {
        setFile(null);
        setSummary(null);
    }

    const handleChange = (files) => {
        setFile(files[0]);
        console.log(files[0]);
    }

    const handleError = (error, file) => {
        console.log('error code ' + error.code + ': ' + error.message)
    }

    // Simple transliteration function for Marathi text in the browser
    const transliterateMarathiForBrowser = (text) => {
        if (!text) return "";

        // This is a simplified version of the backend transliteration
        // It handles common Marathi characters for browser speech synthesis
        const charMap = {
            // Vowels
            'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
            'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'am', 'अः': 'aha',

            // Consonants
            'क': 'ka', 'ख': 'kha', 'ग': 'ga', 'घ': 'gha', 'ङ': 'nga',
            'च': 'cha', 'छ': 'chha', 'ज': 'ja', 'झ': 'jha', 'ञ': 'nya',
            'ट': 'ta', 'ठ': 'tha', 'ड': 'da', 'ढ': 'dha', 'ण': 'na',
            'त': 'ta', 'थ': 'tha', 'द': 'da', 'ध': 'dha', 'न': 'na',
            'प': 'pa', 'फ': 'pha', 'ब': 'ba', 'भ': 'bha', 'म': 'ma',
            'य': 'ya', 'र': 'ra', 'ल': 'la', 'व': 'va', 'श': 'sha',
            'ष': 'sha', 'स': 'sa', 'ह': 'ha', 'ळ': 'la',

            // Matras (vowel signs)
            'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
            'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'm', 'ः': 'h',
        };

        let result = "";
        for (let i = 0; i < text.length; i++) {
            if (text[i] in charMap) {
                result += charMap[text[i]];
            } else {
                result += text[i];
            }
        }

        return result;
    };

    // Function to generate text-to-speech directly in the browser
    const generateSpeech = async (text, language) => {
        if (!text) return;

        try {
            // Use the browser's SpeechSynthesis API
            const synth = window.speechSynthesis;

            // For Marathi, use transliteration to improve speech quality
            let speechText = text;
            let speechLang = language;

            if (language === 'marathi') {
                // For Marathi, transliterate to English phonetics and use English voice
                speechText = transliterateMarathiForBrowser(text);
                speechLang = 'english';

                // Show toast notification about transliteration
                toast({
                    title: "Marathi Speech",
                    description: "Using transliterated text for better pronunciation. For best results, use the audio player below.",
                    status: "info",
                    duration: 4000,
                    isClosable: true,
                });
            }

            // Create a new utterance
            const utterance = new SpeechSynthesisUtterance(speechText);

            // Set the language based on the selected language
            const langMap = {
                'english': 'en-US',
                'hindi': 'hi-IN',
                'marathi': 'mr-IN', // This will be overridden for Marathi
                'bengali': 'bn-IN'
            };

            utterance.lang = langMap[speechLang] || 'en-US';

            // Get available voices and try to find a matching voice for the language
            let voices = synth.getVoices();

            // If voices array is empty, wait for voices to load
            if (voices.length === 0) {
                await new Promise(resolve => {
                    const voicesChangedHandler = () => {
                        voices = synth.getVoices();
                        synth.removeEventListener('voiceschanged', voicesChangedHandler);
                        resolve();
                    };
                    synth.addEventListener('voiceschanged', voicesChangedHandler);

                    // Set a timeout in case voices don't load
                    setTimeout(resolve, 1000);
                });
            }

            // Find a voice that matches the language
            const languageCode = langMap[speechLang];
            let voice = voices.find(v => v.lang === languageCode);

            // If no exact match, try to find a voice that starts with the language code
            if (!voice) {
                voice = voices.find(v => v.lang.startsWith(languageCode.split('-')[0]));
            }

            // If a matching voice is found, use it
            if (voice) {
                console.log(`Using voice: ${voice.name} (${voice.lang})`);
                utterance.voice = voice;
            } else {
                console.warn(`No matching voice found for ${speechLang} (${languageCode})`);
            }

            // Adjust speech parameters for better quality
            utterance.rate = language === 'english' ? 1.0 : 0.9; // Slightly slower for non-English
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
                    description: `Failed to play speech in ${language}. Please try using the audio player below instead.`,
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
                description: "Your browser doesn't support speech synthesis for this language. Please use the audio player below instead.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return null;
        }
    };

    // Handle play button click
    const handlePlaySpeech = () => {
        if (!summary) return;
        generateSpeech(summary, selectedLanguage);
    };

    const uploadFile = () => {
        if (!file) {
            toast({
                title: "No File Selected",
                description: "Please select a file to summarize.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setLoading(true);
        setIsAudioError(false);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("lang", selectedLanguage);

        toast({
            title: "Processing Document",
            description: `Summarizing document in ${selectedLanguage}. This may take a moment...`,
            status: "info",
            duration: 5000,
            isClosable: true,
        });

        fetch("http://localhost:5000/summarize", {
            method: "POST",
            body: formData,
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Server responded with status: ${response.status}`);
                }
                return response.json();
            })
            .then((result) => {
                if (result.error) {
                    throw new Error(result.error);
                }

                setSummary(result.summary);
                setAudio(result.voice);
                setPrecision(result.precision);
                setRatio(result.ratio);

                toast({
                    title: "Summary Generated",
                    description: `Document successfully summarized in ${selectedLanguage}.`,
                    status: "success",
                    duration: 3000,
                    isClosable: true,
                });
            })
            .catch((error) => {
                console.error("Error:", error);
                toast({
                    title: "Error Processing Document",
                    description: error.message || "Failed to summarize the document. Please try again.",
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
            })
            .finally(() => {
                setLoading(false);
            });
    };

    return (
        <DashBoardWrapper page="file">
            <Heading fontSize="3xl">Case Summarizer</Heading>
            <Box padding={{ base: 0, lg: 6 }} marginTop={{ base: 6, lg: 0 }}>
                {file ? (
                    <Box>
                        <Flex width="100%" bg="gray.200" rounded="10" padding="3" flexDirection="row" justifyContent="space-between" alignItems={"center"} mb="6">
                            <Flex flexDirection="column">
                                <Text fontSize={"md"} fontWeight={"bold"}>{file.name}</Text>
                                <Text>{file.sizeReadable}</Text>
                            </Flex>

                            <Button colorScheme="red" onClick={RemoveFile} rounded={"full"} padding={"2"}>
                                <Icon as={RxCross2} boxSize={6} />
                            </Button>
                        </Flex>
                        {summary ? (
                            <Flex flexDirection="column" gap={2} padding={6} border={"2px"} borderColor={"gray.200"} rounded={10}>
                                <Heading size="md" fontWeight="bold" textAlign={{ base: "center", lg: "left" }}>{file.name.split('.')[0]}</Heading>
                                <Text fontSize={{ base: "sm", lg: "md" }} textAlign={"justify"} mt={2}>{summary}</Text>
                                <Text fontSize={"sm"} color={"green"} mt={2}>
                                    Precision: {precision ? `${precision.toFixed(1)}%` : 'N/A'} | Original to Summary Ratio: {ratio ? `${ratio.toFixed(1)}%` : 'N/A'}
                                </Text>

                                <Flex mt={4} alignItems="center" gap={4}>
                                    <Button
                                        leftIcon={isAudioLoaded ? <Icon as={FaStop} /> : <Icon as={FaVolumeUp} />}
                                        colorScheme="yellow"
                                        size="sm"
                                        onClick={isAudioLoaded ?
                                            () => { window.speechSynthesis.cancel(); setIsAudioLoaded(false); } :
                                            handlePlaySpeech
                                        }
                                    >
                                        {isAudioLoaded ? "Stop" : "Listen"}
                                    </Button>

                                    {isAudioLoaded && (
                                        <Text fontSize="xs" color="gray.500">
                                            Playing summary in {selectedLanguage}
                                        </Text>
                                    )}
                                </Flex>

                                {audio && (
                                    <>
                                        <Box mt={4}>
                                            <Text fontSize="sm" fontWeight="medium" mb={1}>
                                                Audio Summary in {selectedLanguage.charAt(0).toUpperCase() + selectedLanguage.slice(1)}:
                                                {selectedLanguage === "marathi" && (
                                                    <Text as="span" fontSize="xs" color="gray.500" ml={2}>
                                                        (Transliterated for better pronunciation)
                                                    </Text>
                                                )}
                                            </Text>
                                            <audio
                                                ref={audioRef}
                                                controls
                                                style={{ width: '100%' }}
                                                onError={() => setIsAudioError(true)}
                                                preload="auto"
                                            >
                                                <source src={audio} type="audio/mpeg" />
                                                Your browser does not support the audio element.
                                            </audio>
                                            {isAudioError && (
                                                <Text color="red.500" fontSize="sm" mt={2}>
                                                    Error loading audio. The file may be unavailable or in an unsupported format.
                                                </Text>
                                            )}
                                            {selectedLanguage === "marathi" && (
                                                <Text fontSize="xs" color="gray.600" mt={2}>
                                                    Note: For Marathi text, we use transliteration to improve speech quality.
                                                    The audio uses phonetic pronunciation of Marathi words in English.
                                                </Text>
                                            )}
                                        </Box>
                                    </>
                                )}
                            </Flex>
                        ) : (
                            <Flex flexDirection="column" gap={2} padding={6} border={"2px"} borderColor={"gray.200"} rounded={10}>
                                <Text fontSize={"md"} mb={2}>Select Language:</Text>
                                <Select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)} mb={4}>
                                    <option value="english">English</option>
                                    <option value="hindi">Hindi</option>
                                    <option value="bengali">Bengali</option>
                                    <option value="marathi">Marathi</option>
                                </Select>
                                {loading ? (
                                    <Spinner />
                                ) : (
                                    <Button size="md" colorScheme="yellow" fontWeight="bold" onClick={uploadFile}>Summarize</Button>
                                )}
                            </Flex>
                        )}
                    </Box>
                ) : (<Files
                    style={{ height: '100px', width: '100%', border: '2px dashed gray', borderRadius: '10px', textAlign: 'center', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    className='files-dropzone'
                    onChange={handleChange}
                    onError={handleError}
                    accepts={['image/png', 'image/jpg', 'image/jpeg', '.pdf']}
                    maxFileSize={1000000}
                    minFileSize={0}
                    clickable>
                    Drop files here or click to upload
                </Files>)}
            </Box>
        </DashBoardWrapper>
    )
}
