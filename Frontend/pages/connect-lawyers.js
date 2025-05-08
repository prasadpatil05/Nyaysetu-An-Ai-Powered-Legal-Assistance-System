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
  Input,
  Select,
  FormControl,
  FormLabel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Textarea,
  useToast,
  Spinner,
  Divider,
  Tag,
  HStack,
  VStack,
  IconButton,
  InputGroup,
  InputLeftElement,
} from "@chakra-ui/react";
import { SearchIcon, PhoneIcon, EmailIcon } from "@chakra-ui/icons";
import {
  getAllVerifiedLawyers,
  getAllLawyers,
  getLawyersBySpecialization,
  createConnectionRequest,
  getUserConnectionRequests
} from "@/lib/db";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ConnectLawyers() {
  const { user } = UserAuth();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [lawyers, setLawyers] = useState([]);
  const [filteredLawyers, setFilteredLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState("");
  const [selectedLawyer, setSelectedLawyer] = useState(null);
  const [connectionSubject, setConnectionSubject] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);
  const [userRequests, setUserRequests] = useState([]);

  const specializations = [
    { value: "", label: "All Specializations" },
    { value: "Civil Law", label: "Civil Law" },
    { value: "Criminal Law", label: "Criminal Law" },
    { value: "Family Law", label: "Family Law" },
    { value: "Corporate Law", label: "Corporate Law" },
    { value: "Tax Law", label: "Tax Law" },
    { value: "Intellectual Property Law", label: "Intellectual Property Law" },
    { value: "Cyber Law", label: "Cyber Law" },
    { value: "Common Law", label: "Common Law" },
  ];

  // Fetch all lawyers
  useEffect(() => {
    const fetchLawyers = async () => {
      try {
        setLoading(true);
        console.log("Fetching lawyers from connect-lawyers page");

        // Use the new direct function instead
        const lawyersList = await getAllLawyers();
        console.log("Lawyers directly fetched:", lawyersList.length);

        if (lawyersList.length === 0) {
          console.log("No lawyers found with direct method, trying original method");
          const backupList = await getAllVerifiedLawyers();
          console.log("Backup method found:", backupList.length, "lawyers");

          if (backupList.length > 0) {
            processAndSetLawyers(backupList);
            return;
          }
        }

        // Process and set the lawyers
        processAndSetLawyers(lawyersList);
      } catch (error) {
        console.error("Error fetching lawyers:", error);
        toast({
          title: "Error",
          description: "Failed to load lawyers. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        setLoading(false);
      }
    };

    // Helper function to process and set lawyers
    const processAndSetLawyers = (lawyersList) => {
      // Process lawyers to ensure all have required fields
      const processedLawyers = lawyersList.map(lawyer => ({
        ...lawyer,
        name: lawyer.name || "Unknown Lawyer",
        specialization: lawyer.specialization || ["General"],
        description: lawyer.description || "No description provided",
        city: lawyer.city || "",
        state: lawyer.state || "",
        experience: lawyer.experience || "",
        degree: lawyer.degree || "LLB",
        fees: lawyer.fees || "Consultation Required"
      }));

      console.log("Processed lawyers:", processedLawyers.length);
      if (processedLawyers.length > 0) {
        console.log("Sample lawyer:", processedLawyers[0]);
      }

      setLawyers(processedLawyers);
      setFilteredLawyers(processedLawyers);
      setLoading(false);
    };

    const fetchUserRequests = async () => {
      if (user?.uid) {
        try {
          const requests = await getUserConnectionRequests(user.uid);
          setUserRequests(requests);
        } catch (error) {
          console.error("Error fetching user requests:", error);
        }
      }
    };

    fetchLawyers();
    fetchUserRequests();
  }, [user, toast]);

  // Filter lawyers based on search term and specialization
  useEffect(() => {
    console.log("Filtering lawyers. Total lawyers:", lawyers.length);
    console.log("Search term:", searchTerm);
    console.log("Selected specialization:", selectedSpecialization);

    if (lawyers.length === 0) {
      setFilteredLawyers([]);
      return;
    }

    let filtered = [...lawyers];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (lawyer) =>
          (lawyer.name && lawyer.name.toLowerCase().includes(term)) ||
          (lawyer.description && lawyer.description.toLowerCase().includes(term)) ||
          (lawyer.city && lawyer.city.toLowerCase().includes(term)) ||
          (lawyer.state && lawyer.state.toLowerCase().includes(term))
      );
      console.log("After search filter:", filtered.length);
    }

    // Filter by specialization
    if (selectedSpecialization && selectedSpecialization !== "") {
      filtered = filtered.filter(lawyer => {
        // Handle array specialization
        if (Array.isArray(lawyer.specialization)) {
          return lawyer.specialization.some(spec =>
            spec.toLowerCase() === selectedSpecialization.toLowerCase()
          );
        }
        // Handle string specialization
        else if (typeof lawyer.specialization === 'string') {
          return lawyer.specialization.toLowerCase() === selectedSpecialization.toLowerCase();
        }
        return false;
      });
      console.log("After specialization filter:", filtered.length);
    }

    console.log("Final filtered lawyers:", filtered.length);
    setFilteredLawyers(filtered);
  }, [searchTerm, selectedSpecialization, lawyers]);

  // Handle connect button click
  const handleConnectClick = (lawyer) => {
    setSelectedLawyer(lawyer);
    setConnectionSubject("");
    onOpen();
  };

  // Test function to directly check Firebase access
  const testFirebaseAccess = async () => {
    try {
      console.log("Testing direct Firebase access to lawyers collection");
      const lawyersRef = collection(db, 'lawyers');
      const snapshot = await getDocs(lawyersRef);

      console.log("Direct Firebase query result:", snapshot.size, "documents");
      snapshot.forEach(doc => {
        console.log("Lawyer document:", doc.id, doc.data());
      });

      // Check current user ID
      console.log("Current user:", user);
      console.log("User ID:", user?.uid);

      toast({
        title: "Firebase Test",
        description: `Found ${snapshot.size} lawyer documents. Your user ID: ${user?.uid}`,
        status: "info",
        duration: 5000,
        isClosable: true,
      });

      // Also check connection requests
      try {
        console.log("Checking connection requests...");
        const requestsRef = collection(db, 'connectionRequests');
        const requestsSnapshot = await getDocs(requestsRef);

        console.log("Connection requests:", requestsSnapshot.size);
        requestsSnapshot.forEach(doc => {
          console.log("Request:", doc.id, doc.data());
        });
      } catch (error) {
        console.error("Error checking connection requests:", error);
      }
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

  // Handle connection request submission
  const handleSubmitRequest = async () => {
    if (!connectionSubject.trim()) {
      toast({
        title: "Error",
        description: "Please enter a subject for your connection request.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setConnectLoading(true);

      console.log("Creating connection request with:", {
        userId: user.uid,
        lawyerId: selectedLawyer.id,
        subject: connectionSubject
      });

      // Check if a request already exists
      const existingRequest = userRequests.find(
        (req) => req.lawyerId === selectedLawyer.id && ['pending', 'accepted'].includes(req.status)
      );

      if (existingRequest) {
        console.log("Existing request found:", existingRequest);
        toast({
          title: "Request Already Exists",
          description: `You already have a ${existingRequest.status} connection request with this lawyer.`,
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
        setConnectLoading(false);
        onClose();
        return;
      }

      const result = await createConnectionRequest(
        user.uid,
        selectedLawyer.id,
        connectionSubject
      );

      console.log("Connection request result:", result);

      if (result.success) {
        toast({
          title: "Request Sent",
          description: "Your connection request has been sent to the lawyer.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });

        // Refresh user requests
        console.log("Refreshing user requests");
        const requests = await getUserConnectionRequests(user.uid);
        console.log("Updated user requests:", requests);
        setUserRequests(requests);
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to send connection request.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }

      setConnectLoading(false);
      onClose();
    } catch (error) {
      console.error("Error sending connection request:", error);
      console.error("Error details:", error.message, error.code);
      toast({
        title: "Error",
        description: "Failed to send connection request. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setConnectLoading(false);
    }
  };

  return (
    <DashBoardWrapper page="connect-lawyers">
      <Box>
        <Flex justifyContent="space-between" alignItems="center" mb={6}>
          <Heading fontSize="3xl">
            Connect with Lawyers
          </Heading>

          <Button
            colorScheme="blue"
            size="sm"
            onClick={testFirebaseAccess}
            leftIcon={<SearchIcon />}
          >
            Test Firebase Access
          </Button>
        </Flex>

        <Flex direction={{ base: "column", md: "row" }} mb={6} gap={4}>
          <InputGroup flex={1}>
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Search by name, description, or location"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              borderColor="yellow.500"
            />
          </InputGroup>

          <Select
            placeholder="Filter by specialization"
            value={selectedSpecialization}
            onChange={(e) => setSelectedSpecialization(e.target.value)}
            width={{ base: "100%", md: "300px" }}
            borderColor="yellow.500"
          >
            {specializations.map((spec) => (
              <option key={spec.value} value={spec.value}>
                {spec.label}
              </option>
            ))}
          </Select>
        </Flex>

        {loading ? (
          <Flex justify="center" align="center" height="300px">
            <Spinner size="xl" color="yellow.500" />
          </Flex>
        ) : filteredLawyers.length === 0 ? (
          <Box textAlign="center" p={8} bg="gray.50" borderRadius="md">
            <Text fontSize="lg">No lawyers found matching your criteria.</Text>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {filteredLawyers.map((lawyer) => {
              // Check if user already has a pending or accepted request with this lawyer
              const existingRequest = userRequests.find(
                (req) => req.lawyerId === lawyer.id && ['pending', 'accepted'].includes(req.status)
              );

              return (
                <Card key={lawyer.id} boxShadow="md" borderRadius="lg" overflow="hidden">
                  <CardHeader bg="gray.50" pb={0}>
                    <Flex spacing="4">
                      <Flex flex="1" gap="4" alignItems="center" flexWrap="wrap">
                        <Avatar name={lawyer.name} src={lawyer.photoURL} size="md" />
                        <Box>
                          <Heading size="md">{lawyer.name}</Heading>
                          <Text color="gray.500" fontSize="sm">
                            {lawyer.degree || "LLB"}
                            {lawyer.experience && ` • ${lawyer.experience} experience`}
                          </Text>
                        </Box>
                      </Flex>
                    </Flex>
                  </CardHeader>
                  <CardBody pt={3}>
                    <Text noOfLines={2} mb={2}>
                      {lawyer.description || "No description provided."}
                    </Text>

                    <HStack spacing={2} mb={2}>
                      <Text fontWeight="bold" fontSize="sm">
                        Specialization:
                      </Text>
                      <Flex wrap="wrap" gap={1}>
                        {Array.isArray(lawyer.specialization)
                          ? lawyer.specialization.map((spec) => (
                              <Badge key={spec} colorScheme="yellow" mr={1}>
                                {spec}
                              </Badge>
                            ))
                          : typeof lawyer.specialization === 'string'
                            ? <Badge colorScheme="yellow" mr={1}>{lawyer.specialization}</Badge>
                            : <Badge colorScheme="yellow" mr={1}>General</Badge>
                        }
                      </Flex>
                    </HStack>

                    <HStack spacing={2} mb={2}>
                      <Text fontWeight="bold" fontSize="sm">
                        Location:
                      </Text>
                      <Text fontSize="sm">
                        {lawyer.city && lawyer.state
                          ? `${lawyer.city}, ${lawyer.state}`
                          : lawyer.city || lawyer.state || "Not specified"}
                      </Text>
                    </HStack>

                    {lawyer.fees && (
                      <HStack spacing={2}>
                        <Text fontWeight="bold" fontSize="sm">
                          Fees:
                        </Text>
                        <Text fontSize="sm">₹{lawyer.fees}</Text>
                      </HStack>
                    )}
                  </CardBody>
                  <Divider />
                  <CardFooter pt={3}>
                    <Button
                      colorScheme={existingRequest ? "gray" : "yellow"}
                      width="100%"
                      onClick={() => handleConnectClick(lawyer)}
                      isDisabled={!!existingRequest}
                    >
                      {existingRequest
                        ? existingRequest.status === 'pending'
                          ? "Request Pending"
                          : "Already Connected"
                        : "Connect"
                      }
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </SimpleGrid>
        )}
      </Box>

      {/* Connection Request Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Connect with {selectedLawyer?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={4}>
              Send a connection request to {selectedLawyer?.name}. Please provide a brief subject for your legal query.
            </Text>
            <FormControl>
              <FormLabel>Subject</FormLabel>
              <Textarea
                placeholder="Briefly describe your legal issue..."
                value={connectionSubject}
                onChange={(e) => setConnectionSubject(e.target.value)}
                rows={4}
              />
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="yellow"
              onClick={handleSubmitRequest}
              isLoading={connectLoading}
            >
              Send Request
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DashBoardWrapper>
  );
}
