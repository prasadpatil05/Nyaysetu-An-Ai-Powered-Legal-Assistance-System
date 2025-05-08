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
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from "@chakra-ui/react";
import {
  getLawyerConnectionRequests,
  updateConnectionRequestStatus,
  createChatRoom
} from "@/lib/db";
import { doc, getDoc, collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Helper function to format dates from different sources
const formatDate = (dateValue) => {
  try {
    if (!dateValue) return "Unknown date";

    // Handle Firestore Timestamp
    if (dateValue.seconds && dateValue.nanoseconds) {
      return new Date(dateValue.seconds * 1000).toLocaleDateString();
    }

    // Handle JavaScript Date object or string
    return new Date(dateValue).toLocaleDateString();
  } catch (error) {
    console.error("Error formatting date:", error, dateValue);
    return "Invalid date";
  }
};

export default function ConnectionRequests() {
  const { user } = UserAuth();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [connectionRequests, setConnectionRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [requestUsers, setRequestUsers] = useState({});

  // Fetch connection requests
  useEffect(() => {
    const fetchRequests = async () => {
      if (user?.uid) {
        try {
          setLoading(true);
          console.log("Fetching connection requests for lawyer:", user.uid);

          const requests = await getLawyerConnectionRequests(user.uid);
          console.log("Lawyer connection requests:", requests);

          setConnectionRequests(requests);

          // Fetch user details for each request
          const userDetails = {};
          for (const request of requests) {
            try {
              console.log("Fetching user details for request:", request);
              const userRef = doc(db, 'users', request.userId);
              const userDoc = await getDoc(userRef);
              if (userDoc.exists()) {
                console.log("User details found:", userDoc.data());
                userDetails[request.userId] = userDoc.data();
              } else {
                console.log("No user document found for:", request.userId);
              }
            } catch (error) {
              console.error(`Error fetching user ${request.userId}:`, error);
            }
          }

          setRequestUsers(userDetails);
          setLoading(false);

          // Add a test toast to confirm the component is working
          if (requests.length === 0) {
            toast({
              title: "No Requests",
              description: `No connection requests found for lawyer ID: ${user.uid}`,
              status: "info",
              duration: 5000,
              isClosable: true,
            });
          } else {
            toast({
              title: "Requests Loaded",
              description: `Found ${requests.length} connection requests`,
              status: "success",
              duration: 3000,
              isClosable: true,
            });
          }
        } catch (error) {
          console.error("Error fetching connection requests:", error);
          console.error("Error details:", error.message, error.code);
          toast({
            title: "Error",
            description: "Failed to load connection requests. Please try again.",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          setLoading(false);
        }
      }
    };

    fetchRequests();
  }, [user, toast]);

  // Handle accept request
  const handleAcceptRequest = (request) => {
    setSelectedRequest(request);
    onOpen();
  };

  // Handle reject request
  const handleRejectRequest = async (requestId) => {
    try {
      setActionLoading(true);

      const result = await updateConnectionRequestStatus(requestId, 'rejected');

      if (result.success) {
        // Update local state
        setConnectionRequests(prevRequests =>
          prevRequests.map(req =>
            req.id === requestId ? { ...req, status: 'rejected' } : req
          )
        );

        toast({
          title: "Request Rejected",
          description: "The connection request has been rejected.",
          status: "info",
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to reject request.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }

      setActionLoading(false);
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast({
        title: "Error",
        description: "Failed to reject request. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setActionLoading(false);
    }
  };

  // Confirm accept request
  const confirmAcceptRequest = async () => {
    try {
      setActionLoading(true);

      // Create chat room
      const chatResult = await createChatRoom(selectedRequest.id);

      if (chatResult.success) {
        // Update local state
        setConnectionRequests(prevRequests =>
          prevRequests.map(req =>
            req.id === selectedRequest.id
              ? { ...req, status: 'accepted', chatRoomId: chatResult.chatRoomId }
              : req
          )
        );

        toast({
          title: "Request Accepted",
          description: "The connection request has been accepted and a chat room has been created.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Error",
          description: chatResult.message || "Failed to accept request.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }

      setActionLoading(false);
      onClose();
    } catch (error) {
      console.error("Error accepting request:", error);
      toast({
        title: "Error",
        description: "Failed to accept request. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setActionLoading(false);
      onClose();
    }
  };

  // Filter requests by status
  const pendingRequests = connectionRequests.filter(req => req.status === 'pending');
  const acceptedRequests = connectionRequests.filter(req => req.status === 'accepted');
  const rejectedRequests = connectionRequests.filter(req => req.status === 'rejected');

  // Render request card
  const renderRequestCard = (request) => {
    const userData = requestUsers[request.userId] || {};

    return (
      <Card key={request.id} boxShadow="md" borderRadius="lg" overflow="hidden">
        <CardHeader bg="gray.50" pb={2}>
          <Flex spacing="4">
            <Flex flex="1" gap="4" alignItems="center" flexWrap="wrap">
              <Avatar name={userData.name} src={userData.photoURL} size="md" />
              <Box>
                <Heading size="md">{userData.name || "User"}</Heading>
                <Text color="gray.500" fontSize="sm">
                  {userData.email}
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
            <Badge
              colorScheme={
                request.status === 'pending' ? 'yellow' :
                request.status === 'accepted' ? 'green' : 'red'
              }
            >
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </Badge>
          </HStack>

          <HStack spacing={2}>
            <Text fontWeight="bold" fontSize="sm">
              Requested:
            </Text>
            <Text fontSize="sm">
              {formatDate(request.createdAt)}
            </Text>
          </HStack>
        </CardBody>

        {request.status === 'pending' && (
          <>
            <Divider />
            <CardFooter pt={3} display="flex" justifyContent="space-between">
              <Button
                colorScheme="red"
                variant="outline"
                onClick={() => handleRejectRequest(request.id)}
                isLoading={actionLoading}
                size="sm"
              >
                Reject
              </Button>
              <Button
                colorScheme="green"
                onClick={() => handleAcceptRequest(request)}
                isLoading={actionLoading}
                size="sm"
              >
                Accept
              </Button>
            </CardFooter>
          </>
        )}

        {request.status === 'accepted' && (
          <>
            <Divider />
            <CardFooter pt={3}>
              <Button
                colorScheme="blue"
                width="100%"
                as="a"
                href={`/lawyer/chat/${request.chatRoomId}`}
                size="sm"
              >
                Open Chat
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    );
  };

  // Test function to directly check Firebase access
  const testFirebaseAccess = async () => {
    try {
      // Check current user ID
      console.log("Current user:", user);
      console.log("Lawyer ID:", user?.uid);

      console.log("Testing direct Firebase access to connectionRequests collection");
      const requestsRef = collection(db, 'connectionRequests');
      const snapshot = await getDocs(requestsRef);

      console.log("Direct Firebase query result:", snapshot.size, "documents");

      const requests = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log("Request document:", doc.id, data);

        // Check if the lawyerId is a string or matches the current user
        if (data.lawyerId) {
          console.log(`Request lawyerId: "${data.lawyerId}" (${typeof data.lawyerId})`);
          console.log(`Current user.uid: "${user.uid}" (${typeof user.uid})`);
          console.log(`Match: ${data.lawyerId === user.uid}`);
        }

        requests.push({ id: doc.id, ...data });
      });

      // Filter for this lawyer - try both string comparison and loose comparison
      const exactMatches = requests.filter(req => req.lawyerId === user.uid);
      const looseMatches = requests.filter(req => String(req.lawyerId) === String(user.uid));

      console.log("Exact matches for current lawyer:", exactMatches.length);
      console.log("Loose matches for current lawyer:", looseMatches.length);

      // Create a test connection request for debugging
      const testRequest = {
        userId: "test-user-" + Date.now(),
        lawyerId: user.uid,
        subject: "Test Request " + new Date().toISOString(),
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log("Creating test request:", testRequest);
      const docRef = await addDoc(requestsRef, testRequest);
      console.log("Test request created with ID:", docRef.id);

      toast({
        title: "Firebase Test",
        description: `Found ${snapshot.size} total requests. Your ID: ${user.uid}. Created test request.`,
        status: "info",
        duration: 5000,
        isClosable: true,
      });
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
    <LawyerDashboardWrapper page="connection-requests">
      <Box>
        <Flex justifyContent="space-between" alignItems="center" mb={6}>
          <Heading fontSize="3xl">
            Connection Requests
          </Heading>

          <Button
            colorScheme="blue"
            size="sm"
            onClick={testFirebaseAccess}
          >
            Test Firebase Access
          </Button>
        </Flex>

        <Tabs colorScheme="yellow" mb={6}>
          <TabList>
            <Tab>Pending ({pendingRequests.length})</Tab>
            <Tab>Accepted ({acceptedRequests.length})</Tab>
            <Tab>Rejected ({rejectedRequests.length})</Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              {loading ? (
                <Flex justify="center" align="center" height="200px">
                  <Spinner size="xl" color="yellow.500" />
                </Flex>
              ) : pendingRequests.length === 0 ? (
                <Box textAlign="center" p={8} bg="gray.50" borderRadius="md">
                  <Text fontSize="lg">No pending connection requests.</Text>
                </Box>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  {pendingRequests.map(renderRequestCard)}
                </SimpleGrid>
              )}
            </TabPanel>

            <TabPanel px={0}>
              {loading ? (
                <Flex justify="center" align="center" height="200px">
                  <Spinner size="xl" color="yellow.500" />
                </Flex>
              ) : acceptedRequests.length === 0 ? (
                <Box textAlign="center" p={8} bg="gray.50" borderRadius="md">
                  <Text fontSize="lg">No accepted connection requests.</Text>
                </Box>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  {acceptedRequests.map(renderRequestCard)}
                </SimpleGrid>
              )}
            </TabPanel>

            <TabPanel px={0}>
              {loading ? (
                <Flex justify="center" align="center" height="200px">
                  <Spinner size="xl" color="yellow.500" />
                </Flex>
              ) : rejectedRequests.length === 0 ? (
                <Box textAlign="center" p={8} bg="gray.50" borderRadius="md">
                  <Text fontSize="lg">No rejected connection requests.</Text>
                </Box>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  {rejectedRequests.map(renderRequestCard)}
                </SimpleGrid>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      {/* Accept Request Confirmation Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Accept Connection Request</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Are you sure you want to accept this connection request? This will create a chat room where you can communicate with the user.
            </Text>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="green"
              onClick={confirmAcceptRequest}
              isLoading={actionLoading}
            >
              Accept
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </LawyerDashboardWrapper>
  );
}
