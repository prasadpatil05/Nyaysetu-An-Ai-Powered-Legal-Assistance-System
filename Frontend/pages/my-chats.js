import { useState, useEffect } from "react";
import DashBoardWrapper from "@/components/DashBoardWrapper";
import { UserAuth } from "@/lib/auth";
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Flex,
  Avatar,
  Badge,
  Spinner,
  Divider,
  HStack,
  VStack,
  useToast,
  Link as ChakraLink,
} from "@chakra-ui/react";
import Link from "next/link";
import { getUserChatRooms, getUserConnectionRequests } from "@/lib/db";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function MyChats() {
  const { user } = UserAuth();
  const toast = useToast();

  const [chatRooms, setChatRooms] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lawyerDetails, setLawyerDetails] = useState({});

  // Fetch chat rooms and pending requests
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return;

      try {
        setLoading(true);

        // Fetch chat rooms
        const rooms = await getUserChatRooms(user.uid);
        setChatRooms(rooms);

        // Fetch pending connection requests
        const requests = await getUserConnectionRequests(user.uid);
        const pendingReqs = requests.filter(req => req.status === 'pending');
        setPendingRequests(pendingReqs);

        // Fetch lawyer details for each chat room and request
        const lawyers = {};

        // For chat rooms
        for (const room of rooms) {
          try {
            const lawyerRef = doc(db, 'lawyers', room.lawyerId);
            const lawyerDoc = await getDoc(lawyerRef);

            if (lawyerDoc.exists()) {
              lawyers[room.lawyerId] = lawyerDoc.data();
            }
          } catch (error) {
            console.error(`Error fetching lawyer ${room.lawyerId}:`, error);
          }
        }

        // For pending requests
        for (const req of pendingReqs) {
          if (!lawyers[req.lawyerId]) {
            try {
              const lawyerRef = doc(db, 'lawyers', req.lawyerId);
              const lawyerDoc = await getDoc(lawyerRef);

              if (lawyerDoc.exists()) {
                lawyers[req.lawyerId] = lawyerDoc.data();
              }
            } catch (error) {
              console.error(`Error fetching lawyer ${req.lawyerId}:`, error);
            }
          }
        }

        setLawyerDetails(lawyers);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load your chats. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        setLoading(false);
      }
    };

    fetchData();
  }, [user, toast]);

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
        return "Unknown date";
      }

      return date.toLocaleDateString();
    } catch (error) {
      console.error("Error formatting timestamp:", error, timestamp);
      return "Unknown date";
    }
  };

  // Render chat room card
  const renderChatRoomCard = (chatRoom) => {
    const lawyer = lawyerDetails[chatRoom.lawyerId] || {};
    const lastMessage = chatRoom.messages?.length > 0
      ? chatRoom.messages[chatRoom.messages.length - 1]
      : null;

    return (
      <Card key={chatRoom.id} boxShadow="md" borderRadius="lg" overflow="hidden">
        <CardHeader bg="gray.50" pb={2}>
          <Flex spacing="4">
            <Flex flex="1" gap="4" alignItems="center" flexWrap="wrap">
              <Avatar name={lawyer.name} src={lawyer.photoURL} size="md" />
              <Box>
                <Heading size="md">{lawyer.name || "Lawyer"}</Heading>
                <Text color="gray.500" fontSize="sm">
                  {lawyer.specialization?.join(", ")}
                </Text>
              </Box>
            </Flex>
          </Flex>
        </CardHeader>
        <CardBody pt={3}>
          <HStack spacing={2} mb={2}>
            <Text fontWeight="bold" fontSize="sm">
              Subject:
            </Text>
            <Text fontSize="sm" noOfLines={1}>
              {chatRoom.subject}
            </Text>
          </HStack>

          {lastMessage && (
            <HStack spacing={2} mb={2}>
              <Text fontWeight="bold" fontSize="sm">
                Last Message:
              </Text>
              <Text fontSize="sm" noOfLines={1}>
                {lastMessage.text.substring(0, 30)}
                {lastMessage.text.length > 30 ? "..." : ""}
              </Text>
            </HStack>
          )}

          <HStack spacing={2}>
            <Text fontWeight="bold" fontSize="sm">
              Last Activity:
            </Text>
            <Text fontSize="sm">
              {formatTimestamp(chatRoom.lastMessageAt)}
            </Text>
          </HStack>
        </CardBody>
        <Divider />
        <CardFooter pt={3}>
          <VStack width="100%" spacing={2}>
            <Link href={`/chat/${chatRoom.id}`} passHref style={{ width: "100%" }}>
              <Button colorScheme="yellow" width="100%">
                Open Chat
              </Button>
            </Link>
            <Text fontSize="xs" color="gray.500" textAlign="center">
              Chat ID: {chatRoom.id}
            </Text>
          </VStack>
        </CardFooter>
      </Card>
    );
  };

  // Render pending request card
  const renderPendingRequestCard = (request) => {
    const lawyer = lawyerDetails[request.lawyerId] || {};

    return (
      <Card key={request.id} boxShadow="md" borderRadius="lg" overflow="hidden">
        <CardHeader bg="gray.50" pb={2}>
          <Flex spacing="4">
            <Flex flex="1" gap="4" alignItems="center" flexWrap="wrap">
              <Avatar name={lawyer.name} src={lawyer.photoURL} size="md" />
              <Box>
                <Heading size="md">{lawyer.name || "Lawyer"}</Heading>
                <Text color="gray.500" fontSize="sm">
                  {lawyer.specialization?.join(", ")}
                </Text>
              </Box>
            </Flex>
          </Flex>
        </CardHeader>
        <CardBody pt={3}>
          <HStack spacing={2} mb={2}>
            <Text fontWeight="bold" fontSize="sm">
              Subject:
            </Text>
            <Text fontSize="sm">{request.subject}</Text>
          </HStack>

          <HStack spacing={2} mb={2}>
            <Text fontWeight="bold" fontSize="sm">
              Status:
            </Text>
            <Badge colorScheme="yellow">Pending</Badge>
          </HStack>

          <HStack spacing={2}>
            <Text fontWeight="bold" fontSize="sm">
              Requested:
            </Text>
            <Text fontSize="sm">
              {formatTimestamp(request.createdAt)}
            </Text>
          </HStack>
        </CardBody>
      </Card>
    );
  };

  // Test function to directly check Firebase access
  const testFirebaseAccess = async () => {
    try {
      console.log("Testing direct Firebase access to chatRooms collection");
      const chatRoomsRef = collection(db, 'chatRooms');
      const snapshot = await getDocs(chatRoomsRef);

      console.log("Direct Firebase query result:", snapshot.size, "documents");

      const chatRooms = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log("Chat room document:", doc.id, data);
        chatRooms.push({ id: doc.id, ...data });
      });

      // Filter for this user
      const userChatRooms = chatRooms.filter(room => String(room.userId) === String(user.uid));
      console.log("Filtered for current user:", userChatRooms.length);

      toast({
        title: "Firebase Test",
        description: `Found ${snapshot.size} total chat rooms, ${userChatRooms.length} for you`,
        status: "info",
        duration: 5000,
        isClosable: true,
      });

      // Refresh the page data
      const rooms = await getUserChatRooms(user.uid);
      setChatRooms(rooms);
      console.log("Updated chat rooms:", rooms);
    } catch (error) {
      console.error("Error in direct Firebase test:", error);
      toast({
        title: "Firebase Test Error",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <DashBoardWrapper page="my-chats">
      <Box>
        <Flex justifyContent="space-between" alignItems="center" mb={6}>
          <Heading fontSize="3xl">
            My Chats
          </Heading>

          <Button
            colorScheme="blue"
            size="sm"
            onClick={testFirebaseAccess}
          >
            Test Firebase Access
          </Button>
        </Flex>

        {loading ? (
          <Flex justify="center" align="center" height="300px">
            <Spinner size="xl" color="yellow.500" />
          </Flex>
        ) : (
          <>
            {pendingRequests.length > 0 && (
              <Box mb={8}>
                <Heading size="md" mb={4}>
                  Pending Requests ({pendingRequests.length})
                </Heading>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  {pendingRequests.map(renderPendingRequestCard)}
                </SimpleGrid>
              </Box>
            )}

            <Box>
              <Heading size="md" mb={4}>
                Active Chats ({chatRooms.length})
              </Heading>

              {chatRooms.length === 0 ? (
                <Box textAlign="center" p={8} bg="gray.50" borderRadius="md">
                  <Text fontSize="lg" mb={4}>
                    You don't have any active chats yet.
                  </Text>
                  <Link href="/connect-lawyers" passHref>
                    <Button colorScheme="yellow">Connect with a Lawyer</Button>
                  </Link>
                </Box>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  {chatRooms.map(renderChatRoomCard)}
                </SimpleGrid>
              )}
            </Box>
          </>
        )}
      </Box>
    </DashBoardWrapper>
  );
}
