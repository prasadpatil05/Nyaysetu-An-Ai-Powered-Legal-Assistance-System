import DashBoardWrapper from "@/components/DashBoardWrapper";
import { Box, Heading, Text, VStack, Input, Button, useToast, Flex, Grid, GridItem, Icon, Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon } from "@chakra-ui/react";
import { useState } from "react";
import { FaIndustry, FaHome, FaCar, FaGavel, FaUserFriends } from 'react-icons/fa';
import { MdSecurity } from 'react-icons/md';

const legalCategories = [
    {
        title: "Labour Laws",
        icon: FaIndustry,
        rights: [
            "Right to minimum wages",
            "Right to equal remuneration",
            "Right to safe working conditions",
            "Right to form trade unions",
            "Protection against workplace harassment"
        ],
        description: "Learn about your rights as an employee, worker benefits, and workplace protections."
    },
    {
        title: "Family Laws",
        icon: FaUserFriends,
        rights: [
            "Marriage rights",
            "Divorce and separation",
            "Child custody and support",
            "Inheritance rights",
            "Domestic violence protection"
        ],
        description: "Understand your rights related to marriage, divorce, inheritance, and family matters."
    },
    {
        title: "Vehicle Laws",
        icon: FaCar,
        rights: [
            "Driving license requirements",
            "Vehicle registration",
            "Traffic rules and penalties",
            "Insurance requirements",
            "Accident claims"
        ],
        description: "Know your rights and responsibilities as a vehicle owner or driver."
    },
    {
        title: "Property Laws",
        icon: FaHome,
        rights: [
            "Property ownership rights",
            "Tenant rights",
            "Real estate transactions",
            "Property inheritance",
            "Land acquisition"
        ],
        description: "Learn about property ownership, tenancy rights, and real estate regulations."
    },
    {
        title: "Criminal Laws",
        icon: FaGavel,
        rights: [
            "Right to legal representation",
            "Protection against arbitrary arrest",
            "Right to fair trial",
            "Rights during police investigation",
            "Bail rights"
        ],
        description: "Understand your rights in criminal proceedings and legal protections."
    },
    {
        title: "Constitutional Rights",
        icon: MdSecurity,
        rights: [
            "Fundamental rights",
            "Right to equality",
            "Freedom of expression",
            "Religious freedom",
            "Right to education"
        ],
        description: "Know your fundamental rights guaranteed by the Constitution of India."
    }
];

const CategoryCard = ({ category, isSelected }) => (
    <Box 
        p={6} 
        borderWidth="1px" 
        borderRadius="lg" 
        _hover={{ 
            shadow: "lg",
            borderColor: "yellow.500",
            transform: "translateY(-2px)",
            transition: "all 0.2s"
        }}
        bg={isSelected ? "yellow.50" : "white"}
    >
        <Flex direction="column" align="center" mb={4}>
            <Icon as={category.icon} boxSize={8} color="yellow.500" mb={2} />
            <Heading size="md" textAlign="center">{category.title}</Heading>
        </Flex>
        <Text color="gray.600" mb={4} textAlign="center">
            {category.description}
        </Text>
        <Accordion allowMultiple>
            <AccordionItem border="none">
                <AccordionButton 
                    _hover={{ bg: 'yellow.50' }}
                    justifyContent="center"
                    color="yellow.600"
                >
                    View Key Rights
                    <AccordionIcon ml={2} />
                </AccordionButton>
                <AccordionPanel>
                    <VStack align="start" spacing={2}>
                        {category.rights.map((right, idx) => (
                            <Text key={idx} fontSize="sm" color="gray.700">
                                • {right}
                            </Text>
                        ))}
                    </VStack>
                </AccordionPanel>
            </AccordionItem>
        </Accordion>
    </Box>
);

const KnowYourRights = () => {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(null);
    const toast = useToast();

    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
        setQuery(""); // Clear previous query
        setResponse(""); // Clear previous response
    };

    const handleSubmit = async () => {
        if (!query.trim()) {
            toast({
                title: "Error",
                description: "Please enter a query",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setLoading(true);
        try {
            const base = 'http://localhost:5000/';
            const response = await fetch(base + 'kyr', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    question: query,
                    category: selectedCategory?.title 
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch response');
            }

            const data = await response.json();
            setResponse(data.answer);
        } catch (error) {
            console.error('Error:', error);
            toast({
                title: "Error",
                description: "Failed to get response. Please try again.",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box p={8}>
            <Heading mb={2}>Know Your Rights</Heading>
            <Text mb={8} color="gray.600">
                Explore your legal rights across different categories. Select a category to learn more or ask a specific question.
            </Text>

            <Grid 
                templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }}
                gap={6}
                mb={8}
            >
                {legalCategories.map((category, idx) => (
                    <GridItem key={idx}>
                        <Box 
                            as="button"
                            width="100%"
                            onClick={() => handleCategorySelect(category)}
                            _focus={{ outline: "none" }}
                        >
                            <CategoryCard 
                                category={category} 
                                isSelected={selectedCategory?.title === category.title}
                            />
                        </Box>
                    </GridItem>
                ))}
            </Grid>

            <Box mt={8}>
                <Heading size="md" mb={4}>
                    {selectedCategory 
                        ? `Ask about ${selectedCategory.title}`
                        : "Have a Specific Question?"}
                </Heading>
                <Flex gap={2}>
                    <Input
                        placeholder={selectedCategory 
                            ? `Ask about your rights related to ${selectedCategory.title.toLowerCase()}...`
                            : "Ask about your rights in any category..."}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                    />
                    <Button
                        colorScheme="yellow"
                        onClick={handleSubmit}
                        isLoading={loading}
                        loadingText="Getting Answer..."
                    >
                        Ask
                    </Button>
                </Flex>

                {response && (
                    <Box
                        mt={4}
                        p={4}
                        bg="gray.50"
                        borderRadius="md"
                        border="1px"
                        borderColor="gray.200"
                    >
                        <Text whiteSpace="pre-line">{response}</Text>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

const KnowYourRightsPage = () => {
    return (
        <DashBoardWrapper page="kyr">
            <KnowYourRights />
        </DashBoardWrapper>
    );
};

export default KnowYourRightsPage;
