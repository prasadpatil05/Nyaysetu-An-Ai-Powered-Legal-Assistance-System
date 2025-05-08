import { useState, useEffect } from "react";
import LawyerDashboardWrapper from "@/components/LawyerDashboardWrapper";
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
import { getLawyerChatRooms } from "@/lib/db";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function LawyerMyChats() {
  const { user } = UserAuth();
  const toast = useToast();

  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState({});

  // Fetch chat rooms
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return;

      try {
        setLoading(true);

        // Fetch chat rooms
        const rooms = await getLawyerChatRooms(user.uid);
        setChatRooms(rooms);

        // Fetch user details for each chat room
        const users = {};

        for (const room of rooms) {
          try {
            const userRef = doc(db, 'users', room.userId);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
              users[room.userId] = userDoc.data();
            }
          } catch (error) {
            console.error(`Error fetching user ${room.userId}:`, error);
          }
        }

        setUserDetails(users);
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
    const client = userDetails[chatRoom.userId] || {};
    const lastMessage = chatRoom.messages?.length > 0
      ? chatRoom.messages[chatRoom.messages.length - 1]
      : null;

    return (
      <Card key={chatRoom.id} boxShadow="md" borderRadius="lg" overflow="hidden">
        <CardHeader bg="gray.50" pb={2}>
          <Flex spacing="4">
            <Flex flex="1" gap="4" alignItems="center" flexWrap="wrap">
              <Avatar name={client.name} src={client.photoURL} size="md" />
              <Box>
                <Heading size="md">{client.name || "Client"}</Heading>
                <Text color="gray.500" fontSize="sm">
                  {client.email}
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
            <Link href={`/lawyer/chat/${chatRoom.id}`} passHref style={{ width: "100%" }}>
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

      // Filter for this lawyer
      const lawyerChatRooms = chatRooms.filter(room => String(room.lawyerId) === String(user.uid));
      console.log("Filtered for current lawyer:", lawyerChatRooms.length);

      toast({
        title: "Firebase Test",
        description: `Found ${snapshot.size} total chat rooms, ${lawyerChatRooms.length} for you`,
        status: "info",
        duration: 5000,
        isClosable: true,
      });

      // Refresh the page data
      const rooms = await getLawyerChatRooms(user.uid);
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
    <LawyerDashboardWrapper page="my-chats">
      <Box>
        <Flex justifyContent="space-between" alignItems="center" mb={6}>
          <Heading fontSize="3xl">
            My Client Chats
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
          <Box>
            {chatRooms.length === 0 ? (
              <Box textAlign="center" p={8} bg="gray.50" borderRadius="md">
                <Text fontSize="lg" mb={4}>
                  You don't have any active chats yet.
                </Text>
                <Link href="/lawyer/connection-requests" passHref>
                  <Button colorScheme="yellow">View Connection Requests</Button>
                </Link>
              </Box>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                {chatRooms.map(renderChatRoomCard)}
              </SimpleGrid>
            )}
          </Box>
        )}
      </Box>
    </LawyerDashboardWrapper>
  );
}
