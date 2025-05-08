import { useContext, createContext, useState, useEffect } from "react";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  TwitterAuthProvider,
  signInWithEmailLink,
  sendSignInLinkToEmail,
  isSignInWithEmailLink
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createBasicLawyer, createUser } from "@/lib/db";
import Router from "next/router";
import { db } from "@/lib/firebase";
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const auth = useAuthProvider();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export const UserAuth = () => {
  return useContext(AuthContext);
}

function useAuthProvider() {
  const [ user, setUser ] = useState(null);

  const redirectUser = (role) => {
    if (role === "lawyer") Router.push("/lawyer/dashboard");
    else if (role === "admin") Router.push("/admin/dashboard");
    else Router.push("/dashboard");
  }

  const handleUser = async (rawUser, role) => {
    if (rawUser) {
      const user = await formatUser(rawUser, role);
      createUser(user)
      if (role === "lawyer") {
        const lawyer = await formatLawyer(user)
        createBasicLawyer(lawyer);
      }
      setUser(user);
      return user;
    } else {
      setUser(false);
      return false;
    }
  }

  const googleSignIn = async (role) => {
    try {
      const provider = new GoogleAuthProvider();
      return signInWithPopup(auth, provider).then((result) => {
        handleUser(result.user, role);
        redirectUser(role);
      });
    } catch (error) {
      console.log(error);
    };
  };

  const twitterSignIn = (role) => {
    try {
      const provider = new TwitterAuthProvider();
      return signInWithPopup(auth, provider).then(async (result) => {
        handleUser(result.user, role);
        redirectUser(role);
      });
    } catch (error) {
      console.log(error)
    }
  };

  const sendSignInLink = (email) => {
    sendSignInLinkToEmail(auth, email, {
      url: window.location.href,
      handleCodeInApp: true,
    }).then(() => {
      localStorage.setItem("email", email);
    }).catch((error) => {
      console.log(error);
    });
  }

  const signInWithEmail = (role) => {
    try {

      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = localStorage.getItem("email");
        if (!email) {
          console.log("This device not allowed to sign in");
        }
        signInWithEmailLink(auth, email, window.location.href).then(async (result) => {
          localStorage.removeItem("email");
          handleUser(result.user, role);
          redirectUser(role);
        });
      }
    } catch (error) {
      console.log(error)
    }
  }

  const logOut = () => {
    signOut(auth);
    handleUser(false);
    Router.push("/login");
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, handleUser);
    return () => unsubscribe();
  }, []);

  return { user, setUser, googleSignIn, logOut, sendSignInLink, signInWithEmail, twitterSignIn }
}

const getUser = async () => {
  await auth.currentUser.getIdToken(true)
  const decodedToken = await auth.currentUser.getIdTokenResult();
  const uid = decodedToken.claims.user_id;
  const userRef = doc(db, 'users', uid);
  const userData = await getDoc(userRef);
  console.log(userData.data())
  return userData.data();
}

const getLawyer = async () => {
  try {
    await auth.currentUser.getIdToken(true);
    const decodedToken = await auth.currentUser.getIdTokenResult();
    const uid = decodedToken.claims.user_id;

    // Use just the UID as the lawyer document ID
    const LawyerRef = doc(db, 'lawyers', uid);
    const LawyerData = await getDoc(LawyerRef);

    if (!LawyerData.exists()) {
      console.log('No lawyer profile found with ID:', uid);
      throw new Error('Lawyer profile not found');
    }

    console.log('Retrieved lawyer profile:', LawyerData.data());
    return LawyerData.data();
  } catch (error) {
    console.error('Error getting lawyer profile:', error);
    throw error;
  }
}

const formatLawyer = async (user) => {
  try {
    console.log('Formatting lawyer profile for user:', user.uid);
    let previousLawyer = null;

    try {
      previousLawyer = await getLawyer();
    } catch (error) {
      console.log('No previous lawyer profile found, creating new one');
    }

    // Create a consistent ID format
    const lawyerId = user.uid;

    return {
      uid: lawyerId,
      name: previousLawyer?.name || user.name,
      status: previousLawyer?.status || "created",
      state: previousLawyer?.state || user.state,
      city: previousLawyer?.city || user.city,
      phone: previousLawyer?.phone || user.phone,
      email: user.email, // Always use current email
      specialization: previousLawyer?.specialization || [],
      degree: previousLawyer?.degree || "",
      experience: previousLawyer?.experience || "",
      lawyerNumber: previousLawyer?.lawyerNumber || "",
      description: previousLawyer?.description || "",
      fees: previousLawyer?.fees || "",
      photoURL: previousLawyer?.photoURL || user.photoURL,
    }
  } catch (error) {
    console.error('Error formatting lawyer profile:', error);
    // Return a basic profile if there's an error
    return {
      uid: user.uid,
      name: user.name,
      email: user.email,
      status: "created",
      specialization: [],
      photoURL: user.photoURL,
    }
  }
}

const formatUser = async (user, role) => {
  const previousUser = await getUser();
  return {
    uid: user.uid,
    email: user.email,
    name: user.displayName || user.email.split('@')[ 0 ],
    photoURL: user.photoURL || "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/User-avatar.svg/1200px-User-avatar.svg.png",
    role: previousUser?.role || role,
    phone: previousUser?.phone || "",
    state: previousUser?.state || "",
    city: previousUser?.city || "",
    age: previousUser?.age || "",
    gender: previousUser?.gender || "",
    profession: previousUser?.profession || "",
    credentials: previousUser?.credentials || [],
    qotd: false,
  };
};

