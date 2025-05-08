import { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Text,
  Heading,
  Divider,
  Badge,
  useColorModeValue,
  Skeleton,
} from '@chakra-ui/react';
import { UserAuth } from '@/lib/auth';
import { getUserQueries } from '@/lib/db';

export default function QueryHistory() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = UserAuth();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    const fetchQueries = async () => {
      if (user) {
        const userQueries = await getUserQueries(user.uid);
        setQueries(userQueries);
        setLoading(false);
      }
    };

    fetchQueries();
  }, [user]);

  if (!user) {
    return (
      <Box p={4}>
        <Text>Please sign in to view your query history.</Text>
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Heading size="md" mb={4}>Your Query History</Heading>
      <VStack spacing={4} align="stretch">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <Skeleton key={i} height="150px" />
          ))
        ) : queries.length === 0 ? (
          <Text>No queries found. Start asking questions to build your history!</Text>
        ) : (
          queries.map((query) => (
            <Box
              key={query.id}
              p={4}
              borderWidth="1px"
              borderRadius="lg"
              bg={bgColor}
              borderColor={borderColor}
              shadow="sm"
            >
              <Text fontWeight="bold" mb={2}>
                {query.question}
              </Text>
              <Text color="gray.600" mb={3}>
                {query.answer}
              </Text>
              <Divider my={2} />
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  {query.specs?.map((spec, index) => (
                    <Badge key={index} mr={2} colorScheme="blue">
                      {spec}
                    </Badge>
                  ))}
                </Box>
                <Badge colorScheme={query.precision >= 0.7 ? "green" : "yellow"}>
                  {Math.round(query.precision * 100)}% match
                </Badge>
              </Box>
              <Text fontSize="sm" color="gray.500" mt={2}>
                {new Date(query.timestamp?.seconds * 1000).toLocaleString()}
              </Text>
            </Box>
          ))
        )}
      </VStack>
    </Box>
  );
}
