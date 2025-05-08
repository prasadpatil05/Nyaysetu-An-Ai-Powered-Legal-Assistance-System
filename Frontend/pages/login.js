import React, { useEffect, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { RiTwitterXFill } from "react-icons/ri";
import { supported, get } from "@github/webauthn-json";
import { PiFingerprintSimpleBold } from "react-icons/pi";
import { withSessionSSR } from "../lib/session";
import { UserAuth } from "@/lib/auth";
import { useRouter } from "next/router";
import { Button, Divider, Flex, Input, Stack, Text, Image, Heading } from "@chakra-ui/react";
import { generateChallenge } from "@/lib/utils";
import { getUser } from "@/lib/db";


export default function Login({ challenge }) {
    const [ email, setEmail ] = useState("");
    const router = useRouter();
    const { user, googleSignIn, sendSignInLink, signInWithEmail, twitterSignIn, setUser } = UserAuth();
    const [ error, setError ] = useState("");
    const [ support, setSupport ] = useState(false);

    useEffect(() => {
        const checkAvailability = async () => {
            try {
                // Check if platform authenticator is available
                const platformAuth = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
                console.log("Platform authenticator available:", platformAuth);
                
                // Check if WebAuthn is supported
                const webAuthnSupport = supported();
                console.log("WebAuthn supported:", webAuthnSupport);
                
                setSupport(webAuthnSupport);
            } catch (error) {
                console.error("Error checking authenticator:", error);
                setSupport(false);
            }
        };

        checkAvailability();
    }, []);

    // Only check for email sign-in link if the URL contains the sign-in link
    useEffect(() => {
        if (window.location.href.includes('apiKey=')) {
            signInWithEmail("user");
        }
    }, [signInWithEmail]);

    // Only redirect if user exists and we're on the login page
    useEffect(() => {
        if (user && window.location.pathname === '/login') {
            router.push("/dashboard");
        }
    }, [user, router]);

    const handleBioLogin = async (event) => {
        event.preventDefault();

        if (!email) {
            setError("Please enter your email before using biometric login");
            return;
        }

        try {
            const isDevelopment = process.env.NODE_ENV === 'development';
            console.log("Starting biometric authentication...");
            
            const credential = await get({
                publicKey: {
                    challenge,
                    timeout: 60000,
                    rpId: isDevelopment ? "localhost" : "nyaysathi.vercel.app",
                    userVerification: "required",
                    authenticatorSelection: {
                        userVerification: "required",
                        residentKey: "preferred",
                    },
                }
            });

            console.log("Credential received:", credential);

            const result = await fetch("/api/login", {
                method: "POST",
                body: JSON.stringify({ email, credential }),
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (result.status !== 200) {
                const { message } = await result.json();
                setError(message || "Authentication failed");
                return;
            }

            const { userId } = await result.json();
            const user = await getUser(userId);
            localStorage.setItem("user", JSON.stringify(user));
            setUser({ ...user, role: "user" });
        } catch (error) {
            console.error("Biometric authentication error:", error);
            if (error.name === "NotAllowedError") {
                setError("Authentication was cancelled. Please try again.");
            } else if (error.name === "SecurityError") {
                setError("Security error. Make sure you're using HTTPS or localhost.");
            } else if (error.name === "NotSupportedError") {
                setError("Your browser doesn't support this authentication method.");
            } else {
                setError("Authentication failed: " + error.message);
            }
        }
    };



    function handleSignIn() {
        try {
            googleSignIn("user");
        } catch (error) {
            console.log(error);
        }
    };

    function handleTwitterSignIn() {
        try {
            twitterSignIn("user");
        }
        catch (error) {
            console.log(error);
        }
    }

    function handleEmailSignIn() {
        try {
            sendSignInLink(email);
        } catch (error) {
            console.log(error);
        }
    }



    return (
        <Flex bg={"gray.100"} height={"100vh"} >
            <Flex display={{ base: "none", lg: "flex" }} justifyContent={"space-between"} width={"40%"} bg="gray.700" padding="30px" flexDirection={"column"}>
                <Flex flexDirection={"row"} justifyContent={"space-between"} alignItems={"flex-start"} gap="4">
                    <Image src="/icon-black.svg" alt="Logo" width="100px" />
                    <Image src="/india.svg" alt="India" width="50px" />
                </Flex>
                <Heading fontSize={"5xl"} color={"white"} mb="20">We&apos;re Here to Simplify the Complexities of Law</Heading>
                <Text color={"gray.200"}> 2025.</Text>
            </Flex>
            <Flex width={{ base: "100%", lg: "60%" }} justifyContent={"center"} alignItems={"center"} padding={{ base: "20px", lg: "none" }}>
                <Flex flexDirection={"column"} width={{ base: "100%", lg: "50%" }} justifyContent={"center"} alignItems={"center"} padding={"40px"} gap="4" bg={"white"} boxShadow='xl' rounded={"10"}>
                    <Stack spacing={8} align="center" mb="8">
                        <Image src="/logo.svg" alt="Logo" width="256px" />
                        <Heading fontSize={"3xl"} textAlign={"center"}>
                            Login
                        </Heading>
                        {error && <Text color={"red.500"}>{error}</Text>}
                    </Stack>
                    <Input placeholder="Enter Your Email" value={email} onChange={(e) => setEmail(e.target.value)} width={"100%"} />
                    <Button onClick={handleEmailSignIn} colorScheme={"yellow"} size='md' width={"100%"} >
                        Continue with Email
                    </Button>
                    {support && <Button leftIcon={<PiFingerprintSimpleBold />} onClick={handleBioLogin} size='md' width={"100%"} >
                        Continue with Biometric
                    </Button>}

                    <Divider margin={"4"} />
                    {/* <HStack>
                        <Text textStyle="sm" whiteSpace="nowrap" color="fg.muted">
                            OR
                        </Text>
                        <Divider />
                    </HStack> */}

                    <Button leftIcon={<FcGoogle />} onClick={handleSignIn} size='md' width={"100%"} >
                        Continue with Google
                    </Button>
                    <Button leftIcon={<RiTwitterXFill />} onClick={handleTwitterSignIn} size='md' width={"100%"} >
                        Continue with Twitter
                    </Button>

                </Flex>
            </Flex>

        </Flex>
    )
}

export const getServerSideProps = withSessionSSR(async function ({ req, res }) {
    const challenge = await generateChallenge();
    req.session.challenge = challenge;
    await req.session.save();

    return { props: { challenge } };
});