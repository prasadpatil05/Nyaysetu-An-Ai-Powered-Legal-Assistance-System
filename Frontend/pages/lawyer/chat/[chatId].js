import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import LawyerDashboardWrapper from "@/components/LawyerDashboardWrapper";
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
} from "@chakra-ui/react";
import { ArrowBackIcon, AttachmentIcon, DownloadIcon, ExternalLinkIcon } from "@chakra-ui/icons";
import { getChatRoomById, sendChatMessage } from "@/lib/db";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadFileToStorage, generateFilePath, getFileTypeCategory } from "@/lib/storage";

export default function LawyerChatRoom() {
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
          router.push("/lawyer/dashboard");
          return;
        }

        // Check if lawyer is a participant
        if (chatRoomData.lawyerId !== user.uid) {
          toast({
            title: "Access Denied",
            description: "You do not have permission to access this chat room.",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          router.push("/lawyer/dashboard");
          return;
        }

        setChatRoom(chatRoomData);

        // Fetch user data
        const userRef = doc(db, 'users', chatRoomData.userId);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          setOtherUser(userDoc.data());
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

      console.log("Sending message as lawyer:", user.uid);
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
    console.log("Current user ID (lawyer):", user?.uid);
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
            bg={isMyMessage ? "green.600" : "gray.200"}
            borderRadius="md"
          >
            <Flex align="center">
              <DownloadIcon mr={2} />
              <Link
                href={url}
                isExternal
                color={isMyMessage ? "white" : "green.500"}
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
          bg={isMyMessage ? "green.600" : "gray.200"}
          borderRadius="md"
        >
          <Flex align="center">
            <AttachmentIcon mr={2} />
            <Link
              href={url}
              isExternal
              color={isMyMessage ? "white" : "green.500"}
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
          bg={isMyMessage ? "green.500" : "gray.100"}
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
            color={isMyMessage ? "green.100" : "gray.500"}
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
    <LawyerDashboardWrapper page="chat">
      <Box height="calc(100vh - 150px)" display="flex" flexDirection="column">
        {/* Chat Header */}
        <Flex
          p={3}
          bg="green.500"
          color="white"
          borderBottom="1px solid"
          borderColor="green.600"
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
            _hover={{ bg: "green.600" }}
            onClick={() => router.push("/lawyer/connection-requests")}
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
                <Text fontSize="xs" color="green.100">
                  {otherUser?.email || ""}
                </Text>
                <Text fontSize="xs" color="green.100" fontStyle="italic">
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
            colorScheme="green"
            onClick={() => fileInputRef.current?.click()}
            isDisabled={loading || sending || isUploading}
            aria-label="Attach file"
            size="md"
          />

          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !isUploading && handleSendMessage()}
            disabled={loading || sending || isUploading}
            bg="gray.50"
            borderRadius="full"
            size="md"
            _focus={{
              boxShadow: "0 0 0 1px green.500",
              borderColor: "green.500"
            }}
          />

          <Button
            colorScheme="green"
            onClick={handleSendMessage}
            isLoading={sending}
            disabled={loading || (!message.trim() && !selectedFile) || isUploading}
            borderRadius="full"
            size="md"
            width="80px"
            _hover={{
              bg: "green.600"
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
                  <Progress value={uploadProgress} size="sm" colorScheme="green" />
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
                colorScheme="green"
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
    </LawyerDashboardWrapper>
  );
}
