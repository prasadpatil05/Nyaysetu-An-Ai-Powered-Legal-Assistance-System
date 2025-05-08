import Web3 from 'web3';
import DocumentStorage from '../contracts/DocumentStorage.json';
import React, { useEffect, useState } from 'react';

/**
 * Helper function to upload a file to Pinata.
 * Uses the Pinata pinFileToIPFS endpoint.
 */
async function uploadToPinata(file) {
  const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
  const formData = new FormData();
  formData.append('file', file, file.name);
  // Optionally add metadata:
  // formData.append('pinataMetadata', JSON.stringify({ name: file.name }));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY,
      pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pinata upload failed: ${response.status} ${errorText}`);
  }
  const data = await response.json();
  console.log('Pinata upload successful:', data);
  return data.IpfsHash;
}

class BlockchainService {
  constructor() {
    this.web3 = null;
    this.contract = null;
    this.account = null;
  }

  async initialize() {
    console.log('Initializing blockchain service...');
    try {
      if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask found, requesting accounts...');
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log('Accounts received:', accounts);
        this.web3 = new Web3(window.ethereum);
        this.account = accounts[0];

        const networkId = await this.web3.eth.net.getId();
        console.log('Network ID:', networkId);

        const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
        console.log('Contract address from env:', contractAddress);
        if (!contractAddress) {
          throw new Error('Contract address not found in environment variables');
        }

        this.contract = new this.web3.eth.Contract(DocumentStorage.abi, contractAddress);
        console.log('Contract initialized successfully');

        const code = await this.web3.eth.getCode(contractAddress);
        if (code === '0x') {
          throw new Error('No contract deployed at the specified address');
        }
        console.log('Contract verified at address');

        window.ethereum.on('accountsChanged', (accounts) => {
          console.log('Account changed to:', accounts[0]);
          this.account = accounts[0];
        });

        window.ethereum.on('chainChanged', (chainId) => {
          console.log('Network changed to:', chainId);
          window.location.reload();
        });

        return true;
      } else {
        throw new Error('Please install MetaMask!');
      }
    } catch (error) {
      console.error('Blockchain service initialization error:', error);
      throw error;
    }
  }

  async uploadDocument(file, isPrivate) {
    if (!file || !(file instanceof File)) {
      throw new Error('Invalid file provided for upload');
    }
    console.log('Starting document upload...', { fileName: file.name, size: file.size, isPrivate });
    try {
      if (!this.contract || !this.account) {
        throw new Error('Blockchain service not properly initialized');
      }
  
      console.log('Uploading file to Pinata...');
      const fileBuffer = await file.arrayBuffer();
      const fileObj = new File([fileBuffer], file.name, { type: file.type });
  
      let cid;
      try {
        cid = await uploadToPinata(fileObj);
        console.log('Pinata upload successful, CID:', cid);
      } catch (error) {
        console.error('Error uploading file to Pinata:', error);
        throw new Error('Failed to upload file to Pinata');
      }
  
      console.log('Storing document on blockchain...', {
        cid,
        fileName: file.name,
        isPrivate,
        fileType: file.type,
        fileSize: file.size
      });
  
      // Call the contract’s uploadDocument function, which stores the uploader (msg.sender)
      const tx = await this.contract.methods
        .uploadDocument(cid, file.name, isPrivate, file.type, file.size)
        .send({ from: this.account });
      console.log('Blockchain transaction successful:', tx);
  
      return { cid, transactionHash: tx.transactionHash };
    } catch (error) {
      console.error('Document upload error:', error);
      throw error;
    }
  }
  
  async getUserDocuments() {
    if (!this.contract || !this.account) {
      throw new Error('Blockchain service not initialized');
    }
    try {
      // Call the contract function that returns document data
      const result = await this.contract.methods.getUserDocuments().call({ from: this.account });
      console.log('Raw documents data from contract:', result);
      
      // Map the returned arrays into document objects.
      let documents = result.ipfsHashes.map((hash, index) => ({
        ipfsHash: hash,
        fileName: result.fileNames[index],
        isPrivate: result.privacyFlags[index],
        timestamp: new Date(Number(result.timestamps[index]) * 1000),
        fileType: result.fileTypes[index],
        fileSize: Number(result.fileSizes[index]),
        uploader: result.uploaders ? result.uploaders[index] : this.account
      }));
      
      // Filter documents to show only those uploaded by the current account.
      documents = documents.filter(doc =>
        doc.uploader.toLowerCase() === this.account.toLowerCase()
      );
      
      console.log('Filtered documents:', documents);
      return documents;
    } catch (error) {
      console.error('Error getting user documents:', error);
      throw error;
    }
  }
  
  // Helper method to get the IPFS URL from a hash.
  getIPFSUrl(ipfsHash) {
    return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
  }
}

export const blockchainService = new BlockchainService();
