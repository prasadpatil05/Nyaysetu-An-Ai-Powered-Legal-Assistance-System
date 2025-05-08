// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DocumentStorage {
    struct Document {
        string ipfsHash;
        string fileName;
        bool isPrivate;
        string fileType;
        uint256 fileSize;
        uint256 timestamp;
        address uploader;  // NEW: record the uploader
    }
    
    Document[] public documents;
    
    event DocumentUploaded(
        address indexed user,
        string ipfsHash,
        string fileName,
        bool isPrivate,
        uint256 timestamp
    );
    
    // When a document is uploaded, store all details including msg.sender as the uploader.
    function uploadDocument(
        string memory _ipfsHash,
        string memory _fileName,
        bool _isPrivate,
        string memory _fileType,
        uint256 _fileSize
    ) public {
        documents.push(Document({
            ipfsHash: _ipfsHash,
            fileName: _fileName,
            isPrivate: _isPrivate,
            fileType: _fileType,
            fileSize: _fileSize,
            timestamp: block.timestamp,
            uploader: msg.sender   // record the uploader
        }));
        emit DocumentUploaded(msg.sender, _ipfsHash, _fileName, _isPrivate, block.timestamp);
    }
    
    // Updated getter that returns uploader addresses along with other document data.
    function getUserDocuments() public view returns (
        string[] memory ipfsHashes,
        string[] memory fileNames,
        bool[] memory privacyFlags,
        uint256[] memory timestamps,
        string[] memory fileTypes,
        uint256[] memory fileSizes,
        address[] memory uploaders
    ) {
        uint256 count = documents.length;
        ipfsHashes = new string[](count);
        fileNames = new string[](count);
        privacyFlags = new bool[](count);
        timestamps = new uint256[](count);
        fileTypes = new string[](count);
        fileSizes = new uint256[](count);
        uploaders = new address[](count);
        
        for (uint256 i = 0; i < count; i++) {
            Document storage doc = documents[i];
            ipfsHashes[i] = doc.ipfsHash;
            fileNames[i] = doc.fileName;
            privacyFlags[i] = doc.isPrivate;
            timestamps[i] = doc.timestamp;
            fileTypes[i] = doc.fileType;
            fileSizes[i] = doc.fileSize;
            uploaders[i] = doc.uploader;
        }
    }
}
