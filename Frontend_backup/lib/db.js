import { db } from '@/lib/firebase';
import { doc, getDoc, where, orderBy, limit, query, collection, getDocs, setDoc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export const createUser = (user) => {
  try {
    const userRef = doc(db, 'users', user.uid);
    return setDoc(userRef, user, { merge: true });
  } catch (error) {
    console.log(error);
  }

}

export const addCredential = async (user, credential) => {
  const userRef = doc(db, 'users', user);
  const userData = await getDoc(userRef);
  const credentials = userData.data().credentials;
  credentials.push(credential);
  await updateDoc(userRef, { credentials });
}

export const findOneByEmail = async (email) => {
  const usersCollection = collection(db, 'users');
  const q = query(usersCollection, where('email', '==', email));
  const querySnapshot = await getDocs(q);
  const users = [];
  querySnapshot.forEach((doc) => {
    users.push({ id: doc.id, ...doc.data() });
  }
  );
  return users[ 0 ];
}

export const getUser = async (uid) => {
  const userRef = doc(db, 'users', uid);
  const userData = await getDoc(userRef);
  return userData.data();
}

export const saveFile = async (uid, nmae, url, size, isPrivate, type) => {
  const filesCollection = collection(db, 'files');
  const newFile = {
    user: uid,
    name: nmae,
    url: url,
    size: size,
    isPrivate: isPrivate,
    type: type,
  }
  await addDoc(filesCollection, newFile);
}

export const getUserFiles = async (uid) => {
  const filesCollection = collection(db, 'files');
  const q = query(filesCollection, where('user', '==', uid));
  const querySnapshot = await getDocs(q);
  const files = [];
  querySnapshot.forEach((doc) => {
    files.push(doc.data());
  });
  return files;
}




export const getCentersDb = async (state, city) => {
  try {
    console.log(state)
    console.log(city)
    const centersCollection = collection(db, 'centers');
    const q = query(
      centersCollection,
      where('state', '==', state),
      where('city', '==', city)
    );

    const querySnapshot = await getDocs(q);

    const centers = [];
    querySnapshot.forEach((doc) => {
      // Add each document's data to the centers array
      centers.push({ id: doc.id, ...doc.data() });
    });

    return centers;
  } catch (error) {
    console.error("Error fetching centers: ", error);
    // Handle the error as needed
    return [];
  }
};

export const updateQOTD = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists) {
      console.log('User not found');
      return;
    }
    console.log(userDoc)

    const updatedUser = await updateDoc(userRef, {
      qotd: true,
    });
    console.log('User QOTD updated successfully');
    return updatedUser;
  } catch (error) {
    console.error('Error updating user QOTD:', error.message);
  }
}



export const updateDetailsDB = async (uid, name, phone, state, city, age, gender, profession) => {
  try {

    const usersCollection = collection(db, 'users');
    console.log(usersCollection)
    const userDocRef = doc(usersCollection, uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists) {
      console.log('User not found');
      return;
    }
    console.log(userDoc)

    const updatedUser = await updateDoc(userDocRef, {
      name: name,
      phone: phone,
      state: state,
      city: city,
      age: age,
      gender: gender,
      profession: profession
    });
    console.log('User details updated successfully');
    return updatedUser;
  } catch (error) {
    console.error('Error updating user details:', error.message);
  }
};


export async function getRandomQuestion() {
  try {
    const questionsCollection = collection(db, 'questions');
    // Get all documents from the collection
    const q = query(
      questionsCollection,
    );

    const snapshot = await getDocs(q);

    // Check if there are any documents
    if (snapshot.empty) {
      console.log('No questions found in the collection.');
      return null;
    }

    // Get a random document
    const randomIndex = Math.floor(Math.random() * snapshot.size);
    const randomQuestion = snapshot.docs[ randomIndex ].data();

    // Log or process the random question
    console.log('Random Question:', randomQuestion);

    return randomQuestion;
  } catch (error) {
    console.error('Error getting random question:', error);
    return null;
  }
}

//admin functions
export const createCenter = async (title, city, state, address, phone, locationURL) => {
  const centerRef = collection(db, 'centers');
  const centerData = {
    title: title,
    address: address,
    state: state,
    city: city,
    locationURL: locationURL,
    phone: phone,
  };
  const newCenter = await addDoc(centerRef, centerData);
  console.log(newCenter.id)
  await setDoc(newCenter, { uid: newCenter.id, ...centerData })
}

export const createQuestion = async (question, options, correctOption) => {
  const questionsCollection = collection(db, 'questions');
  const questionData = {
    question: question,
    options: options,
    correct: correctOption,
  };
  const newQuestion = await addDoc(questionsCollection, questionData);
  await setDoc(newQuestion, { uid: newQuestion.id, ...questionData })
}

export const getAllQuestions = async () => {
  const questionsCollection = collection(db, 'questions');

  try {
    const querySnapshot = await getDocs(questionsCollection);
    const questions = [];

    querySnapshot.forEach((doc) => {
      questions.push({ id: doc.uid, ...doc.data() });
    });

    return questions;
  } catch (error) {
    console.error('Error getting questions:', error);
    throw error;
  }
};
export const updateQuestionDB = async (uid, question, options, correctOption) => {
  try {
    console.log(uid)
    const questionsCollection = collection(db, 'questions');
    console.log(questionsCollection)
    const questionDocRef = doc(questionsCollection, uid);
    console.log('question doc ref : ', questionDocRef)
    const questionDoc = await getDoc(questionDocRef);
    if (!questionDoc.exists) {
      console.log('question not found');
      return;
    }
    console.log(questionDoc)

    const updatedQuestion = await updateDoc(questionDocRef, {
      question: question,
      options: options,
      correct: correctOption,
    });
    console.log('question updated successfully');
    return updatedQuestion;
  } catch (error) {
    console.error('Error updating question:', error.message);
  }
};

export const deleteQuestion = async (questionUid) => {
  const questionRef = doc(db, 'questions', questionUid);

  try {
    await deleteDoc(questionRef);
    console.log('Question deleted successfully');
  } catch (error) {
    console.error('Error deleting question:', error);
    throw error;
  }
};

export const getAllCenters = async () => {
  const centersCollection = collection(db, 'centers');

  try {
    const querySnapshot = await getDocs(centersCollection);
    const centers = [];

    querySnapshot.forEach((doc) => {
      centers.push({ id: doc.uid, ...doc.data() });
    });

    return centers;
  } catch (error) {
    console.error('Error getting centers:', error);
    throw error;
  }
};

export const deleteCenter = async (centerUid) => {
  const centerRef = doc(db, 'centers', centerUid);
  console.log("Hello Center", centerUid);
  try {
    await deleteDoc(centerRef);
    console.log('Center deleted successfully');
  } catch (error) {
    console.error('Error deleting center:', error);
    throw error;
  }
};

export const updateCenterDB = async (uid, title, city, state, address, phone, locationURL) => {
  try {
    console.log(uid)
    const centersCollection = collection(db, 'centers');
    console.log(centersCollection)
    const centerDocRef = doc(centersCollection, uid);
    console.log('center doc ref : ', centerDocRef)
    const centerDoc = await getDoc(centerDocRef);
    if (!centerDoc.exists) {
      console.log('center not found');
      return;
    }
    console.log(centerDoc)

    const updatedCenter = await updateDoc(centerDocRef, {
      title: title,
      city: city,
      state: state,
      address: address,
      phone: phone,
      locationURL: locationURL,
    });
    console.log('center updated successfully');
    return updatedCenter;
  } catch (error) {
    console.error('Error updating center:', error.message);
  }
};

// lawyers

export const getPendingLawyers = async () => {
  const lawyersCollection = collection(db, 'lawyers');
  const q = query(lawyersCollection, where('status', '==', 'pending'));
  const querySnapshot = await getDocs(q);
  const lawyers = [];
  querySnapshot.forEach((doc) => {
    lawyers.push(doc.data());
  });
  return lawyers;
}
export const getLawyerProfile = async (uid, _email) => { // _email param kept for backward compatibility
  try {
    console.log('Getting lawyer profile for UID:', uid);

    // Try to get the lawyer document directly by UID first
    const lawyerRef = doc(db, 'lawyers', uid);
    const lawyerDoc = await getDoc(lawyerRef);

    if (lawyerDoc.exists()) {
      console.log('Found lawyer profile by UID');
      return lawyerDoc.data();
    }

    // Fallback: query by uid field in case document ID doesn't match
    console.log('Trying to find lawyer profile by uid field');
    const lawyersCollection = collection(db, 'lawyers');
    const q = query(lawyersCollection, where('uid', '==', uid));
    const querySnapshot = await getDocs(q);

    const lawyers = [];
    querySnapshot.forEach((doc) => {
      lawyers.push(doc.data());
    });

    if (lawyers.length > 0) {
      console.log('Found lawyer profile by query');
      return lawyers[0];
    }

    console.log('No lawyer profile found');
    return null;
  } catch (error) {
    console.error('Error getting lawyer profile:', error);
    throw error;
  }
}

export const createBasicLawyer = async (lawyer) => {
  try {
    console.log('Creating basic lawyer profile with ID:', lawyer.uid);
    const LawyerRef = doc(db, 'lawyers', lawyer.uid);

    // Add creation timestamp
    const lawyerData = {
      ...lawyer,
      createdAt: new Date(),
      status: "pending"
    };

    await setDoc(LawyerRef, lawyerData, { merge: true });
    console.log('Basic lawyer profile created successfully');
    return true;
  } catch (error) {
    console.error('Error creating basic lawyer profile:', error);
    throw error;
  }
}

export const updateLawyerDetailsDB = async (uid, name, phone, state, city, age, gender, lawyerNo, degree, description, specialization, experience, fees) => {
  try {
    console.log('Updating lawyer with ID:', uid);

    // Get current authentication state
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error("User not authenticated. Please log in again.");
    }

    // Ensure we have a valid UID
    if (!uid) {
      throw new Error("Invalid lawyer ID. Please try again.");
    }

    console.log('Current user:', auth.currentUser.uid);
    console.log('Update data:', { name, phone, state, city, age, gender, lawyerNo, degree, description, specialization, experience, fees });

    const lawyersCollection = collection(db, 'lawyers');
    const lawyerDocRef = doc(lawyersCollection, uid);

    // Prepare the lawyer data
    const lawyerData = {
      name: name,
      phone: phone,
      state: state,
      city: city,
      age: age,
      gender: gender,
      lawyerNumber: lawyerNo,
      degree: degree,
      description: description,
      specialization: specialization,
      experience: experience,
      fees: fees,
      status: "pending",
      updatedAt: new Date()
    };

    // Check if document exists, if not create it
    const lawyerDoc = await getDoc(lawyerDocRef);
    if (!lawyerDoc.exists()) {
      console.log('Creating new lawyer profile');
      await setDoc(lawyerDocRef, {
        uid: uid,
        email: auth.currentUser.email,
        createdAt: new Date(),
        ...lawyerData
      });
    } else {
      console.log('Updating existing lawyer profile');
      await updateDoc(lawyerDocRef, lawyerData);
    }

    console.log('Lawyer details updated successfully');
    return true;
  } catch (error) {
    console.error('Detailed error:', error);
    // Provide more specific error messages based on the error type
    if (error.code === 'permission-denied') {
      throw new Error("Permission denied: You don't have access to update this profile. Please check your authentication status.");
    } else if (error.code === 'not-found') {
      throw new Error("Lawyer profile not found. Please try creating a new profile.");
    } else {
      throw error;
    }
  }
};

export const getLawyer = async (specs) => {
  const lawyerCollection = collection(db, 'lawyers');

  const q = query(
    lawyerCollection,
    where('specialization', 'array-contains-any', specs),
    orderBy('credit', 'desc'),
    limit(3)
  );

  try {
    const querySnapshot = await getDocs(q);
    const lawyers = [];

    querySnapshot.forEach((doc) => {
      lawyers.push(doc.data());
    });

    console.log("IN DB: " + lawyers);

    return lawyers;
  } catch (error) {
    console.error('Error fetching lawyers:', error.message);
    return [];
  }
};

export const VerifyLawyer = async (lawyerUid) => {
  try {
    const lawyerRef = doc(db, 'lawyers', lawyerUid);
    const lawyerData = {
      status: "verified"
    }
    await updateDoc(lawyerRef, lawyerData);
  } catch (error) {
    console.log(error)
  }
}

export const deleteLawyer = async (lawyerUid) => {
  try {
    const lawyerRef = doc(db, 'lawyers', lawyerUid);
    const lawyerData = {
      status: "rejected"
    }
    await updateDoc(lawyerRef, lawyerData);
  } catch (error) {
    console.log(error)
  }

}

export const createChat = async (uid, messages) => {
  const chatRef = doc(db, 'chats', uid);
  const chatData = {
    id: uid,
    user: uid,
    messages: messages,
  };
  await setDoc(chatRef, chatData, { merge: true })
  return chatData.id;
}

export const addMessage = async (chatId, message) => {
  const chatRef = doc(db, 'chats', chatId);
  const data = await getDoc(chatRef);
  const chatData = {
    messages: data.data().messages.concat(message),
  };
  await updateDoc(chatRef, chatData);
}

export const findChatByUserId = async (uid) => {
  const chatsCollection = collection(db, 'chats');
  const q = query(chatsCollection, where('user', '==', uid));
  const querySnapshot = await getDocs(q);
  const chats = [];
  querySnapshot.forEach((doc) => {
    chats.push(doc.data());
  });
  return chats[ 0 ];
}

// Query Management
export const saveQuery = async (uid, queryData) => {
  try {
    const queriesCollection = collection(db, 'queries');
    const newQuery = {
      userId: uid,
      question: queryData.question,
      answer: queryData.answer,
      timestamp: new Date(),
      sourceDocs: queryData.docs || [],
      precision: queryData.precision || 0,
      specs: queryData.specs || []
    };
    await addDoc(queriesCollection, newQuery);
    return true;
  } catch (error) {
    console.error('Error saving query:', error);
    return false;
  }
};

export const getUserQueries = async (uid) => {
  try {
    const queriesCollection = collection(db, 'queries');
    const q = query(
      queriesCollection,
      where('userId', '==', uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const querySnapshot = await getDocs(q);
    const queries = [];
    querySnapshot.forEach((doc) => {
      queries.push({ id: doc.id, ...doc.data() });
    });
    return queries;
  } catch (error) {
    console.error('Error getting user queries:', error);
    return [];
  }
};

// Lawyer Connection Functions

// Get all verified lawyers (original function)
export const getAllVerifiedLawyers = async () => {
  try {
    console.log('Fetching all lawyers');
    const lawyersCollection = collection(db, 'lawyers');

    // First try to get lawyers with verified status
    let q = query(
      lawyersCollection,
      where('status', '==', 'verified'),
      orderBy('name')
    );

    let querySnapshot = await getDocs(q);
    let lawyers = [];

    querySnapshot.forEach((doc) => {
      lawyers.push({ id: doc.id, ...doc.data() });
    });

    console.log('Found verified lawyers:', lawyers.length);

    // If no verified lawyers found, get all lawyers regardless of status
    if (lawyers.length === 0) {
      console.log('No verified lawyers found, fetching all lawyers');
      q = query(lawyersCollection, orderBy('name'));
      querySnapshot = await getDocs(q);

      querySnapshot.forEach((doc) => {
        // Only include lawyers with complete profiles
        const data = doc.data();
        if (data.name && data.specialization) {
          lawyers.push({ id: doc.id, ...data });
        }
      });

      console.log('Found total lawyers:', lawyers.length);
    }

    return lawyers;
  } catch (error) {
    console.error('Error getting lawyers:', error);
    return [];
  }
};

// Get all lawyers directly (new simplified function)
export const getAllLawyers = async () => {
  try {
    console.log('Directly fetching ALL lawyers without filters');
    const lawyersCollection = collection(db, 'lawyers');
    const querySnapshot = await getDocs(lawyersCollection);

    const lawyers = [];
    querySnapshot.forEach((doc) => {
      console.log('Found lawyer:', doc.id, doc.data());
      lawyers.push({
        id: doc.id,
        ...doc.data(),
        // Ensure these fields exist
        name: doc.data().name || "Unknown Lawyer",
        specialization: doc.data().specialization || ["General"],
      });
    });

    console.log('Total lawyers found:', lawyers.length);
    console.log('Lawyer data sample:', lawyers.length > 0 ? lawyers[0] : 'No lawyers');

    return lawyers;
  } catch (error) {
    console.error('Error directly getting all lawyers:', error);
    console.error('Error details:', error.message, error.code);
    return [];
  }
};

// Get lawyers by specialization
export const getLawyersBySpecialization = async (specialization) => {
  try {
    const lawyersCollection = collection(db, 'lawyers');
    const q = query(
      lawyersCollection,
      where('status', '==', 'verified'),
      where('specialization', 'array-contains', specialization)
    );

    const querySnapshot = await getDocs(q);
    const lawyers = [];

    querySnapshot.forEach((doc) => {
      lawyers.push({ id: doc.id, ...doc.data() });
    });

    return lawyers;
  } catch (error) {
    console.error('Error getting lawyers by specialization:', error);
    return [];
  }
};

// Create a connection request
export const createConnectionRequest = async (userId, lawyerId, subject) => {
  try {
    console.log('Creating connection request:', { userId, lawyerId, subject });
    const connectionRequestsCollection = collection(db, 'connectionRequests');

    // Check if a request already exists - simplified query to avoid potential issues
    const allRequestsQuery = query(
      connectionRequestsCollection,
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(allRequestsQuery);
    let existingRequest = false;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Convert to string for comparison
      if (String(data.lawyerId) === String(lawyerId) && ['pending', 'accepted'].includes(data.status)) {
        existingRequest = true;
        console.log('Found existing request:', doc.id, data);
      }
    });

    if (existingRequest) {
      console.log('Request already exists');
      return { success: false, message: 'A connection request already exists with this lawyer' };
    }

    // Create new request - ensure all values are strings for consistency
    const newRequest = {
      userId: String(userId),
      lawyerId: String(lawyerId),
      subject: String(subject),
      status: 'pending',
      createdAt: new Date(), // Use JS Date for now
      updatedAt: new Date()
    };

    console.log('Creating new request with data:', newRequest);
    const docRef = await addDoc(connectionRequestsCollection, newRequest);
    console.log('Request created with ID:', docRef.id);

    // Create a test request with the same data but different ID to verify
    try {
      const testRequest = {
        ...newRequest,
        subject: `${subject} (TEST)`,
        testRequest: true
      };
      console.log('Creating test request with data:', testRequest);
      const testDocRef = await addDoc(connectionRequestsCollection, testRequest);
      console.log('Test request created with ID:', testDocRef.id);
    } catch (testError) {
      console.error('Error creating test request:', testError);
    }

    return { success: true, requestId: docRef.id };
  } catch (error) {
    console.error('Error creating connection request:', error);
    console.error('Error details:', error.message, error.code);
    return { success: false, message: error.message };
  }
};

// Get user's connection requests
export const getUserConnectionRequests = async (userId) => {
  try {
    const connectionRequestsCollection = collection(db, 'connectionRequests');
    const q = query(
      connectionRequestsCollection,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const requests = [];

    querySnapshot.forEach((doc) => {
      requests.push({ id: doc.id, ...doc.data() });
    });

    return requests;
  } catch (error) {
    console.error('Error getting user connection requests:', error);
    return [];
  }
};

// Get lawyer's connection requests
export const getLawyerConnectionRequests = async (lawyerId) => {
  try {
    console.log('Getting connection requests for lawyer:', lawyerId);
    const connectionRequestsCollection = collection(db, 'connectionRequests');

    // Get all requests and filter manually to handle different data types
    const querySnapshot = await getDocs(connectionRequestsCollection);
    const requests = [];

    console.log('Total connection requests found:', querySnapshot.size);

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('Checking request:', doc.id, data);

      // Convert both to strings for comparison to handle different data types
      const requestLawyerId = String(data.lawyerId || '');
      const currentLawyerId = String(lawyerId || '');

      console.log(`Comparing: "${requestLawyerId}" with "${currentLawyerId}"`);

      if (requestLawyerId === currentLawyerId) {
        console.log('Found matching request:', doc.id);

        // Convert timestamps to JS Date objects if needed
        let processedData = { ...data };
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          processedData.createdAt = data.createdAt.toDate();
        }
        if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
          processedData.updatedAt = data.updatedAt.toDate();
        }

        requests.push({ id: doc.id, ...processedData });
      }
    });

    console.log('Found requests for lawyer:', requests.length);

    // Sort by createdAt if available
    requests.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return 0;
    });

    return requests;
  } catch (error) {
    console.error('Error getting lawyer connection requests:', error);
    console.error('Error details:', error.message, error.code);
    return [];
  }
};

// Update connection request status
export const updateConnectionRequestStatus = async (requestId, status) => {
  try {
    console.log('Updating connection request status:', { requestId, status });
    const requestRef = doc(db, 'connectionRequests', requestId);

    // First check if the request exists
    const requestDoc = await getDoc(requestRef);
    if (!requestDoc.exists()) {
      console.error('Connection request not found:', requestId);
      return { success: false, message: 'Connection request not found' };
    }

    console.log('Current request data:', requestDoc.data());

    const updateData = {
      status,
      updatedAt: new Date()
    };

    console.log('Updating with data:', updateData);
    await updateDoc(requestRef, updateData);
    console.log('Connection request status updated successfully');

    return { success: true };
  } catch (error) {
    console.error('Error updating connection request:', error);
    console.error('Error details:', error.message, error.code);
    return { success: false, message: error.message };
  }
};

// Create a chat room when connection is accepted
export const createChatRoom = async (connectionRequestId) => {
  try {
    console.log('Creating chat room for connection request:', connectionRequestId);

    // Get the connection request
    const requestRef = doc(db, 'connectionRequests', connectionRequestId);
    const requestDoc = await getDoc(requestRef);

    if (!requestDoc.exists()) {
      console.error('Connection request not found:', connectionRequestId);
      return { success: false, message: 'Connection request not found' };
    }

    const requestData = requestDoc.data();
    console.log('Connection request data:', requestData);

    // Create a chat room - ensure all IDs are strings
    const chatRoomsCollection = collection(db, 'chatRooms');
    const chatRoom = {
      connectionRequestId: String(connectionRequestId),
      userId: String(requestData.userId || ''),
      lawyerId: String(requestData.lawyerId || ''),
      subject: String(requestData.subject || 'Chat'),
      createdAt: new Date(),
      lastMessageAt: new Date(),
      messages: []
    };

    console.log('Creating chat room with data:', chatRoom);
    const chatRoomRef = await addDoc(chatRoomsCollection, chatRoom);
    console.log('Chat room created with ID:', chatRoomRef.id);

    // Update the connection request with the chat room ID
    const updateData = {
      chatRoomId: chatRoomRef.id,
      status: 'accepted',
      updatedAt: new Date()
    };

    console.log('Updating connection request with:', updateData);
    await updateDoc(requestRef, updateData);
    console.log('Connection request updated successfully');

    return { success: true, chatRoomId: chatRoomRef.id };
  } catch (error) {
    console.error('Error creating chat room:', error);
    console.error('Error details:', error.message, error.code);
    return { success: false, message: error.message };
  }
};

// Get user's chat rooms
export const getUserChatRooms = async (userId) => {
  try {
    console.log('Getting chat rooms for user:', userId);
    const chatRoomsCollection = collection(db, 'chatRooms');

    // Get all chat rooms and filter manually to handle different data types
    const querySnapshot = await getDocs(chatRoomsCollection);
    const chatRooms = [];

    console.log('Total chat rooms found:', querySnapshot.size);

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('Checking chat room:', doc.id, data);

      // Convert both to strings for comparison to handle different data types
      const roomUserId = String(data.userId || '');
      const currentUserId = String(userId || '');

      console.log(`Comparing: "${roomUserId}" with "${currentUserId}"`);

      if (roomUserId === currentUserId) {
        console.log('Found matching chat room for user:', doc.id);

        // Process data to ensure consistent formats
        const processedData = {
          id: doc.id,
          ...data,
          // Ensure these fields exist
          userId: String(data.userId || ''),
          lawyerId: String(data.lawyerId || ''),
          subject: String(data.subject || 'Chat'),
          messages: Array.isArray(data.messages) ? data.messages : []
        };

        // Convert timestamps if needed
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          processedData.createdAt = data.createdAt.toDate();
        }
        if (data.lastMessageAt && typeof data.lastMessageAt.toDate === 'function') {
          processedData.lastMessageAt = data.lastMessageAt.toDate();
        }

        chatRooms.push(processedData);
      }
    });

    console.log('Found chat rooms for user:', chatRooms.length);

    // Sort by lastMessageAt if available
    chatRooms.sort((a, b) => {
      if (a.lastMessageAt && b.lastMessageAt) {
        return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
      }
      return 0;
    });

    return chatRooms;
  } catch (error) {
    console.error('Error getting user chat rooms:', error);
    console.error('Error details:', error.message, error.code);
    return [];
  }
};

// Get lawyer's chat rooms
export const getLawyerChatRooms = async (lawyerId) => {
  try {
    console.log('Getting chat rooms for lawyer:', lawyerId);
    const chatRoomsCollection = collection(db, 'chatRooms');

    // Get all chat rooms and filter manually to handle different data types
    const querySnapshot = await getDocs(chatRoomsCollection);
    const chatRooms = [];

    console.log('Total chat rooms found:', querySnapshot.size);

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('Checking chat room:', doc.id, data);

      // Convert both to strings for comparison to handle different data types
      const roomLawyerId = String(data.lawyerId || '');
      const currentLawyerId = String(lawyerId || '');

      console.log(`Comparing: "${roomLawyerId}" with "${currentLawyerId}"`);

      if (roomLawyerId === currentLawyerId) {
        console.log('Found matching chat room for lawyer:', doc.id);

        // Process data to ensure consistent formats
        const processedData = {
          id: doc.id,
          ...data,
          // Ensure these fields exist
          userId: String(data.userId || ''),
          lawyerId: String(data.lawyerId || ''),
          subject: String(data.subject || 'Chat'),
          messages: Array.isArray(data.messages) ? data.messages : []
        };

        // Convert timestamps if needed
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          processedData.createdAt = data.createdAt.toDate();
        }
        if (data.lastMessageAt && typeof data.lastMessageAt.toDate === 'function') {
          processedData.lastMessageAt = data.lastMessageAt.toDate();
        }

        chatRooms.push(processedData);
      }
    });

    console.log('Found chat rooms for lawyer:', chatRooms.length);

    // Sort by lastMessageAt if available
    chatRooms.sort((a, b) => {
      if (a.lastMessageAt && b.lastMessageAt) {
        return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
      }
      return 0;
    });

    return chatRooms;
  } catch (error) {
    console.error('Error getting lawyer chat rooms:', error);
    console.error('Error details:', error.message, error.code);
    return [];
  }
};

// Send a message in a chat room
export const sendChatMessage = async (chatRoomId, senderId, message, fileAttachment = null) => {
  try {
    console.log('Sending chat message:', { chatRoomId, senderId, message, hasAttachment: !!fileAttachment });
    const chatRoomRef = doc(db, 'chatRooms', chatRoomId);
    const chatRoomDoc = await getDoc(chatRoomRef);

    if (!chatRoomDoc.exists()) {
      console.error('Chat room not found:', chatRoomId);
      return { success: false, message: 'Chat room not found' };
    }

    // Get chat room data
    const data = chatRoomDoc.data();

    // Log sender information for debugging
    console.log('Sender info:', {
      senderId: String(senderId),
      lawyerId: String(data.lawyerId),
      userId: String(data.userId),
      isLawyer: String(senderId) === String(data.lawyerId),
      isClient: String(senderId) === String(data.userId)
    });

    // Create the new message - IMPORTANT: ensure senderId is stored as a string
    const newMessage = {
      senderId: String(senderId),
      text: String(message),
      timestamp: new Date(),
      // Add file attachment information if present
      hasAttachment: !!fileAttachment
    };

    // Add file information if there's an attachment
    if (fileAttachment) {
      newMessage.attachment = {
        type: fileAttachment.type,
        name: fileAttachment.name,
        url: fileAttachment.url,
        size: fileAttachment.size,
        fileType: fileAttachment.fileType // 'image', 'pdf', 'document', etc.
      };
    }

    console.log('New message:', newMessage);

    // Get current messages array
    const currentMessages = Array.isArray(data.messages) ? data.messages : [];

    console.log('Current messages count:', currentMessages.length);

    // Add new message and update lastMessageAt
    const updateData = {
      messages: [...currentMessages, newMessage],
      lastMessageAt: new Date()
    };

    console.log('Updating chat room with new message');
    await updateDoc(chatRoomRef, updateData);
    console.log('Chat message sent successfully');

    return { success: true };
  } catch (error) {
    console.error('Error sending chat message:', error);
    console.error('Error details:', error.message, error.code);
    return { success: false, message: error.message };
  }
};

// Get chat room by ID
export const getChatRoomById = async (chatRoomId) => {
  try {
    console.log('Getting chat room by ID:', chatRoomId);
    const chatRoomRef = doc(db, 'chatRooms', chatRoomId);
    const chatRoomDoc = await getDoc(chatRoomRef);

    if (!chatRoomDoc.exists()) {
      console.error('Chat room not found:', chatRoomId);
      return null;
    }

    const data = chatRoomDoc.data();
    console.log('Chat room data:', data);

    // Process data to ensure consistent formats
    const processedData = {
      id: chatRoomId,
      ...data,
      // Ensure these fields exist
      userId: String(data.userId || ''),
      lawyerId: String(data.lawyerId || ''),
      subject: String(data.subject || 'Chat'),
      messages: Array.isArray(data.messages) ? data.messages : []
    };

    // Convert timestamps if needed
    if (data.createdAt && typeof data.createdAt.toDate === 'function') {
      processedData.createdAt = data.createdAt.toDate();
    }
    if (data.lastMessageAt && typeof data.lastMessageAt.toDate === 'function') {
      processedData.lastMessageAt = data.lastMessageAt.toDate();
    }

    console.log('Processed chat room data:', processedData);
    return processedData;
  } catch (error) {
    console.error('Error getting chat room:', error);
    console.error('Error details:', error.message, error.code);
    return null;
  }
};

