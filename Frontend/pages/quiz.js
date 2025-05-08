import {
    Box,
    Button,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    FormControl,
    FormLabel,
    RadioGroup,
    Stack,
    Radio,
    useToast,
    Icon,
    useDisclosure,
} from "@chakra-ui/react";
import { FiCheckCircle, FiXCircle } from "react-icons/fi";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import DashBoardWrapper from "@/components/DashBoardWrapper";
import { getRandomQuestion, updateQOTD } from "@/lib/db";
import { UserAuth } from "@/lib/auth";

export default function Quiz() {
    const { isOpen, onOpen, onClose } = useDisclosure()
    const { user, setUser } = UserAuth();
    const [ qotd, setQOTD ] = useState();
    const router = useRouter();
    const [ selectedAnswer, setSelectedAnswer ] = useState("");
    const toast = useToast();
    const [ question, setQuestions ] = useState("");
    const [ options, setOptions ] = useState([]);
    const [ correct, setCorrect ] = useState("");


    const handleSubmit = () => {
        if (selectedAnswer === correct) {
            toast({
                title: "Correct Answer!",
                description: "Congratulations! Your answer is correct.",
                status: "success",
                duration: 3000,
                isClosable: true,
                position: 'top',

            });
            router.push("/dashboard");
        } else {
            toast({
                title: "Incorrect Answer",
                description: "Sorry, your answer is incorrect. Try again!",
                status: "error",
                duration: 3000,
                isClosable: true,
                position: 'top',
            });
        }
        setUser({ ...user, qotd: true });
        updateQOTD(user.uid);
    };

    const handleCancel = () => {
        router.push("/dashboard");
    };

    const questionPrompt = async () => {
        const questionDb = await getRandomQuestion();
        if (questionDb) {
            setQuestions(questionDb.question);
            setOptions(questionDb.options);
            setCorrect(questionDb.correct);
        } else {
            // Handle case when no question is returned
            console.error("No question returned from database");
            toast({
                title: "Error",
                description: "Could not load question. Please try again later.",
                status: "error",
                duration: 3000,
                isClosable: true,
                position: 'top',
            });
            router.push("/dashboard");
        }
    }

    useEffect(() => {
        setQOTD(user?.qotd);
        questionPrompt();
    }, [ user ]);


    return (
        <DashBoardWrapper>
            <Modal isOpen={true} size="full" isCentered >
                <ModalOverlay />
                <ModalContent borderRadius="md" bg="gray.100">
                    <ModalHeader
                        textAlign="center"
                        fontSize="xl"
                        borderTopRadius="md"
                        bg="gray.200"
                        color="black"
                    >
                        Question of the Day
                    </ModalHeader>
                    <ModalBody bg={"gray.200"}>
                        <Box >
                            <FormControl>
                                <FormLabel fontSize="xl" fontWeight="bold" mb={4} >
                                    {question}
                                </FormLabel>
                                <RadioGroup onChange={(e) => setSelectedAnswer(e)}>
                                    <Stack spacing={4}>
                                        {options.map((option, index) => (
                                            <Box
                                                key={index}
                                                borderWidth="1px"
                                                borderRadius="md"
                                                borderColor={"black"}
                                                padding="2"
                                                transition="transform 0.2s"
                                                _hover={{ transform: "translateY(-4px)" }}
                                            >
                                                <Radio value={option} colorScheme="yellow">{option}</Radio>
                                            </Box>
                                        ))}
                                    </Stack>
                                </RadioGroup>
                            </FormControl>
                        </Box>
                    </ModalBody>
                    <ModalFooter justifyContent="center" bg={"gray.200"}>
                        <Button
                            colorScheme="yellow"
                            mr={3}
                            onClick={handleSubmit}
                            leftIcon={<Icon as={FiCheckCircle} />}
                        >
                            Submit
                        </Button>
                        <Button
                            onClick={handleCancel}
                            bg={"blackAlpha.200"}
                            leftIcon={<Icon as={FiXCircle} />}
                        >
                            Cancel
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </DashBoardWrapper>
    )
}

