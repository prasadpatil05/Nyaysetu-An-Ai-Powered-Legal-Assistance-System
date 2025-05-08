import DashBoardWrapper from "@/components/DashBoardWrapper";
import { 
    Button, 
    Flex, 
    Heading, 
    Modal, 
    ModalOverlay, 
    ModalContent, 
    ModalHeader, 
    ModalFooter, 
    ModalBody, 
    ModalCloseButton, 
    useDisclosure, 
    Text, 
    Switch,
    Input, 
    useToast, 
    SimpleGrid, 
    Box, 
    Link,
    VStack,
    HStack,
    FormControl,
    FormLabel,
    IconButton,
    Checkbox,
    Icon
} from "@chakra-ui/react";
import { PiUploadSimpleBold, PiFilePdf, PiFileJpg, PiFilePng } from "react-icons/pi";
import { HiOutlineExternalLink } from "react-icons/hi";
import { RxCross2 } from "react-icons/rx";
import { useState, useEffect } from "react";
import { UserAuth } from "@/lib/auth";
import { blockchainService } from "@/lib/blockchain";

const Storage = () => {
    const { user } = UserAuth();
    const [file, setFile] = useState(null);
    const [isPrivate, setIsPrivate] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isBlockchainInitialized, setIsBlockchainInitialized] = useState(false);
    const [documents, setDocuments] = useState([]);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const toast = useToast();

    const iconMap = {
        'application/pdf': PiFilePdf,
        'image/jpg': PiFileJpg,
        'image/png': PiFilePng,
        'image/jpeg': PiFileJpg,
    }

    const handleUpload = async () => {
        if (!file) {
            toast({
                title: "Error",
                description: "Please select a file to upload",
                status: "error",
                duration: 3000,
                isClosable: true,
                position: 'top',
            });
            return;
        }

        setIsUploading(true);
        try {
            console.log('Starting upload process...', { fileName: file.name, size: file.size });
            
            // Check if blockchain is initialized
            if (!blockchainService || !blockchainService.contract) {
                throw new Error('Please connect your wallet first');
            }

            // Upload the file
            const result = await blockchainService.uploadDocument(file, isPrivate);
            console.log('Upload successful:', result);

            // Clear the form
            setFile(null);
            setIsPrivate(false);
            onClose();

            // Show success message
            toast({
                title: "Success",
                description: "File uploaded successfully to blockchain",
                status: "success",
                duration: 5000,
                isClosable: true,
                position: 'top',
            });

            // Refresh the file list
            loadUserDocuments();
        } catch (error) {
            console.error('Upload error:', error);
            toast({
                title: "Upload Failed",
                description: error.message || "Failed to upload file. Please try again.",
                status: "error",
                duration: 5000,
                isClosable: true,
                position: 'top',
            });
        } finally {
            setIsUploading(false);
        }
    };

    const connectWallet = async () => {
        try {
            const initialized = await blockchainService.initialize();
            setIsBlockchainInitialized(initialized);
            if (initialized) {
                toast({
                    title: "Connected",
                    description: "Successfully connected to MetaMask",
                    status: "success",
                    duration: 3000,
                    isClosable: true,
                    position: 'top',
                });
                loadUserDocuments();
            }
        } catch (error) {
            console.error('Error connecting wallet:', error);
            toast({
                title: "Connection Error",
                description: error.message || "Failed to connect wallet. Please try again.",
                status: "error",
                duration: 5000,
                isClosable: true,
                position: 'top',
            });
        }
    };

    useEffect(() => {
        // Check if already connected
        if (window.ethereum && window.ethereum.selectedAddress) {
            connectWallet();
        }
    }, []);

    const loadUserDocuments = async () => {
        try {
            const docs = await blockchainService.getUserDocuments();
            setDocuments(docs.map(doc => ({
                name: doc.fileName,
                url: blockchainService.getIPFSUrl(doc.ipfsHash),
                size: `${(doc.fileSize / 1024).toFixed(2)} KB`,
                isPrivate: doc.isPrivate,
                type: doc.fileType,
                timestamp: doc.timestamp
            })));
        } catch (error) {
            console.error('Error loading documents:', error);
            toast({
                title: "Error",
                description: "Failed to load your documents",
                status: "error",
                duration: 3000,
                isClosable: true,
                position: 'top',
            });
        }
    };

    if (!user) {
        return (
            <DashBoardWrapper page="storage">
                loading...
            </DashBoardWrapper>
        )
    }

    return (
        <DashBoardWrapper page="storage">
            <Modal isOpen={isOpen} onClose={onClose} size={{ base: "full", lg: "lg" }} isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Upload File</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack spacing={4}>
                            {file && (
                                <HStack
                                    w="full"
                                    p={2}
                                    bg="gray.100"
                                    borderRadius="md"
                                    justifyContent="space-between"
                                >
                                    <Text>{file.name} ({Math.round(file.size / 1024)} KB)</Text>
                                    <IconButton
                                        icon={<RxCross2 />}
                                        size="sm"
                                        onClick={() => setFile(null)}
                                    />
                                </HStack>
                            )}
                            <Input
                                type="file"
                                onChange={(e) => setFile(e.target.files[0])}
                                display="none"
                                id="file-upload"
                            />
                            <FormControl>
                                <FormLabel htmlFor="file-upload">
                                    <Button as="span" isDisabled={isUploading}>
                                        Select File
                                    </Button>
                                </FormLabel>
                            </FormControl>
                            <FormControl>
                                <Checkbox
                                    isChecked={isPrivate}
                                    onChange={(e) => setIsPrivate(e.target.checked)}
                                    isDisabled={isUploading}
                                >
                                    Contains sensitive data or evidence?
                                </Checkbox>
                                <Text fontSize="sm" color="gray.500" mt={2}>
                                    Private files are securely stored on the blockchain using IPFS. They are immutable and tamper-proof, making them ideal for sensitive data & evidence.
                                </Text>
                            </FormControl>
                        </VStack>
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            colorScheme="yellow"
                            onClick={handleUpload}
                            isLoading={isUploading}
                            loadingText="Uploading to Blockchain..."
                            isDisabled={!file}
                        >
                            Upload to Blockchain
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <Flex direction="column" p={4} gap={4}>
                <Flex justify="space-between" align="center">
                    <Heading size="lg">Secure Storage</Heading>
                    <Flex gap={4} align="center">
                        {!isBlockchainInitialized ? (
                            <Button
                                colorScheme="blue"
                                onClick={connectWallet}
                            >
                                Connect MetaMask
                            </Button>
                        ) : (
                            <Button
                                leftIcon={<PiUploadSimpleBold />}
                                colorScheme="yellow"
                                onClick={onOpen}
                            >
                                Upload File
                            </Button>
                        )}
                    </Flex>
                </Flex>

                <Heading fontSize="xl" mb={"4"} mt={"4"}>My Files</Heading>
                <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6}>
                    {documents.map((file, index) => {
                        if (file.isPrivate) return null;
                        return (
                            <Flex key={index} width="100%" bg="gray.200" rounded="10" padding="3" flexDirection="column" justifyContent={"center"} gap="4">
                                <Flex flexDirection="row" gap="4">
                                    <Flex bg="yellow.400" padding={"2"} rounded={"full"} justifyContent={"center"} alignItems={"center"}>
                                        <Icon as={iconMap[file.type]} boxSize={8} />
                                    </Flex>
                                    <Flex flexDirection="column">
                                        <Text fontSize={"md"} fontWeight={"bold"}>{file.name}</Text>
                                        <Text>{file.size}</Text>
                                        <Text fontSize="sm" color="gray.600">
                                            {new Date(file.timestamp).toLocaleDateString()}
                                        </Text>
                                    </Flex>
                                </Flex>
                                <Link href={file.url} target="_blank" display={"flex"} justifyContent={"flex-end"} alignItems={"center"} gap={"2"} color={"yellow.700"}>
                                    View Document <HiOutlineExternalLink />
                                </Link>
                            </Flex>
                        );
                    })}
                </SimpleGrid>

                <Heading fontSize="xl" mb={"4"} mt={"8"}>Private Files</Heading>
                <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6}>
                    {documents.map((file, index) => {
                        if (!file.isPrivate) return null;
                        return (
                            <Flex key={index} width="100%" bg="gray.200" rounded="10" padding="3" flexDirection="column" justifyContent={"center"} gap="4">
                                <Flex flexDirection="row" gap="4">
                                    <Flex bg="yellow.400" padding={"2"} rounded={"full"} justifyContent={"center"} alignItems={"center"}>
                                        <Icon as={iconMap[file.type]} boxSize={8} />
                                    </Flex>
                                    <Flex flexDirection="column">
                                        <Text fontSize={"md"} fontWeight={"bold"}>{file.name}</Text>
                                        <Text>{file.size}</Text>
                                        <Text fontSize="sm" color="gray.600">
                                            {new Date(file.timestamp).toLocaleDateString()}
                                        </Text>
                                    </Flex>
                                </Flex>
                                <Link href={file.url} target="_blank" display={"flex"} justifyContent={"flex-end"} alignItems={"center"} gap={"2"} color={"yellow.700"}>
                                    View Document <HiOutlineExternalLink />
                                </Link>
                            </Flex>
                        );
                    })}
                </SimpleGrid>
            </Flex>
        </DashBoardWrapper>
    );
};

export default Storage;