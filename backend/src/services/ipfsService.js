import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import axios from 'axios';
import FormData from 'form-data';
import logger from '../utils/logger.js';

/**
 * IPFS service using Pinata HTTP API
 */
class IPFSService {
  constructor() {
    this.jwt = null; // Will be loaded on first use
    this.pinataApiUrl = 'https://api.pinata.cloud';
    this.pinataGateway = 'https://gateway.pinata.cloud';
    this.initialized = false;
    this.initAttempted = false;
  }

  /**
   * Get JWT (lazy load from environment)
   */
  getJWT() {
    if (!this.jwt) {
      this.jwt = process.env.PINATA_JWT;
      logger.info('Loading Pinata JWT from environment');
      logger.info('JWT exists:', !!this.jwt);
      logger.info('JWT length:', this.jwt?.length);
    }
    return this.jwt;
  }

  /**
   * Initialize Pinata (test authentication)
   */
  async initialize() {
    if (this.initAttempted) {
      logger.info('IPFS initialization already attempted. Current status:', this.initialized);
      return;
    }

    this.initAttempted = true;

    // Get JWT from environment
    const jwt = this.getJWT();

    logger.info('🚀 Attempting IPFS service initialization...');

    try {
      if (!jwt) {
        logger.warn('⚠️ Pinata JWT not configured. IPFS uploads will be disabled.');
        this.initialized = false;
        return;
      }

      // Test authentication with a simple API call
      logger.info('🔐 Testing Pinata authentication...');
      const response = await axios.get(`${this.pinataApiUrl}/data/testAuthentication`, {
        headers: {
          Authorization: `Bearer ${jwt}`
        }
      });

      logger.info('📡 Pinata auth response:', response.data);

      if (response.data && response.data.message) {
        this.initialized = true;
        logger.info('✅ IPFS Service (Pinata) initialized successfully');
      } else {
        throw new Error('Invalid authentication response');
      }
    } catch (error) {
      this.initialized = false;
      logger.error('❌ Failed to initialize IPFS service');
      logger.error('Error details:', error.response?.data || error.message);
      logger.error('Status code:', error.response?.status);
      // Don't throw here, let checkInitialized handle it
    }
  }

  /**
   * Check if service is initialized (and initialize if needed)
   */
  async checkInitialized() {
    if (!this.initAttempted) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('IPFS service not initialized. Check Pinata JWT token.');
    }
  }

  /**
   * Upload file to IPFS using Pinata HTTP API
   */
  async uploadFile(filePath, options = {}) {
    await this.checkInitialized();

    try {
      const fileName = options.name || path.basename(filePath);
      const jwt = this.getJWT();

      // Create FormData
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));

      // Add metadata if provided
      if (options.metadata) {
        formData.append('pinataMetadata', JSON.stringify({
          name: fileName,
          ...options.metadata
        }));
      }

      // Upload to Pinata
      const response = await axios.post(
        `${this.pinataApiUrl}/pinning/pinFileToIPFS`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${jwt}`,
            ...formData.getHeaders()
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity
        }
      );

      logger.info(`File uploaded to IPFS: ${response.data.IpfsHash}`);

      return {
        ipfsHash: response.data.IpfsHash,
        url: `${this.pinataGateway}/ipfs/${response.data.IpfsHash}`,
        size: response.data.PinSize,
        timestamp: response.data.Timestamp
      };
    } catch (error) {
      logger.error('IPFS upload failed:', error.response?.data || error.message);
      throw new Error(`Failed to upload file to IPFS: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Upload JSON data to IPFS using Pinata HTTP API
   */
  async uploadJSON(data, name = 'metadata.json') {
    await this.checkInitialized();

    try {
      const jwt = this.getJWT();

      const response = await axios.post(
        `${this.pinataApiUrl}/pinning/pinJSONToIPFS`,
        {
          pinataContent: data,
          pinataMetadata: { name }
        },
        {
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`JSON uploaded to IPFS: ${response.data.IpfsHash}`);

      return {
        ipfsHash: response.data.IpfsHash,
        url: `ipfs://${response.data.IpfsHash}`,
        httpUrl: `${this.pinataGateway}/ipfs/${response.data.IpfsHash}`
      };
    } catch (error) {
      logger.error('JSON upload failed:', error.response?.data || error.message);
      throw new Error(`Failed to upload JSON to IPFS: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Upload comic package (cover + pages + metadata)
   */
  async uploadComicPackage(options) {
    await this.checkInitialized();

    const { pages, coverImage, metadata, comicId } = options;

    try {
      logger.info(`Uploading comic package: ${comicId}`);

      // 1. Upload cover image
      const coverUpload = await this.uploadFile(coverImage, {
        name: `${comicId}-cover${path.extname(coverImage)}`,
        metadata: { type: 'cover', comicId }
      });

      // 2. Upload pages
      const pageUploads = [];
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const pageNumber = i + 1;

        const originalUpload = await this.uploadFile(page.path, {
          name: `${comicId}-page-${pageNumber}${path.extname(page.path)}`,
          metadata: { type: 'page', comicId, pageNumber }
        });

        pageUploads.push({
          pageNumber,
          original: originalUpload
        });

        logger.info(`Uploaded page ${pageNumber}/${pages.length}`);
      }

      // 3. Create metadata JSON
      const metadataJson = {
        name: metadata.name,
        description: metadata.description,
        comicId,
        series: metadata.series,
        issueNumber: metadata.issueNumber,
        cover: coverUpload.ipfsHash,
        pages: pageUploads.map(p => ({
          pageNumber: p.pageNumber,
          ipfsHash: p.original.ipfsHash
        })),
        totalPages: pages.length,
        created: new Date().toISOString()
      };

      const metadataUpload = await this.uploadJSON(
        metadataJson,
        `${comicId}-metadata.json`
      );

      // 4. Create CBZ archive
      const cbzPath = await this.createCBZ(comicId, coverImage, pages);
      const cbzUpload = await this.uploadFile(cbzPath, {
        name: `${comicId}.cbz`,
        metadata: { type: 'cbz', comicId }
      });

      // Cleanup CBZ file
      fs.unlinkSync(cbzPath);

      logger.info(`Comic package uploaded successfully: ${comicId}`);

      return {
        metadataUri: metadataUpload.url,
        metadataHash: metadataUpload.ipfsHash,
        cover: {
          ipfsHash: coverUpload.ipfsHash,
          url: coverUpload.url
        },
        pages: {
          pages: pageUploads.map(p => ({
            pageNumber: p.pageNumber,
            original: {
              ipfsHash: p.original.ipfsHash,
              url: p.original.url
            },
            web: {
              ipfsHash: p.original.ipfsHash,
              url: p.original.url
            },
            thumbnail: {
              ipfsHash: p.original.ipfsHash,
              url: p.original.url
            }
          }))
        },
        cbz: {
          ipfsHash: cbzUpload.ipfsHash,
          url: cbzUpload.url
        }
      };
    } catch (error) {
      logger.error('Comic package upload failed:', error);
      throw error;
    }
  }

  /**
   * Create CBZ archive from comic pages
   */
  async createCBZ(comicId, coverImage, pages) {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(process.env.UPLOAD_DIR || './uploads', `${comicId}.cbz`);
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        logger.info(`CBZ created: ${outputPath} (${archive.pointer()} bytes)`);
        resolve(outputPath);
      });

      archive.on('error', (err) => {
        logger.error('CBZ creation failed:', err);
        reject(err);
      });

      archive.pipe(output);

      // Add cover
      archive.file(coverImage, { name: '00-cover' + path.extname(coverImage) });

      // Add pages
      pages.forEach((page, index) => {
        const pageNumber = String(index + 1).padStart(3, '0');
        archive.file(page.path, { 
          name: `${pageNumber}${path.extname(page.path)}` 
        });
      });

      archive.finalize();
    });
  }

  /**
   * Unpin file from IPFS using Pinata HTTP API
   */
  async unpinFile(ipfsHash) {
    await this.checkInitialized();

    try {
      const jwt = this.getJWT();

      await axios.delete(
        `${this.pinataApiUrl}/pinning/unpin/${ipfsHash}`,
        {
          headers: {
            'Authorization': `Bearer ${jwt}`
          }
        }
      );
      logger.info(`Unpinned from IPFS: ${ipfsHash}`);
      return true;
    } catch (error) {
      logger.error('Failed to unpin file:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Get gateway URL for IPFS hash
   */
  getGatewayUrl(ipfsHash) {
    return `${this.pinataGateway}/ipfs/${ipfsHash}`;
  }
}

// Export single instance
const ipfsService = new IPFSService();
export default ipfsService;