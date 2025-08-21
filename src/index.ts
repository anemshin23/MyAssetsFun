//import eliza core type
import {
  logger,
  type Character,
  type IAgentRuntime,
  type Project,
  type ProjectAgent,
  ModelType,
} from '@elizaos/core';

import * as fs from 'fs'; //imports file system operations so can read files
import * as path from 'path'; //imports path operations for file handling
import { myCharacter } from './character'; //imports character from character.ts
import { TwitterApi } from 'twitter-api-v2';
import { startBundleHubServer, broadcastBundleUpdate as broadcastToBundleHub } from './standalone-server';

import 'dotenv/config';

export const character: Character = myCharacter; //exports character for Eliza to use 

// Interface for completed bundles that will be saved
interface CompletedBundle {
  id: string;
  originalTweetId: string;
  originalUsername: string;
  originalCashtag: string;
  bundle: string[];
  completedAt: string;
  conversationType: 'single_tweet' | 'conversation';
  tweetText?: string;
  profileImageUrl?: string;
}

// Global storage for completed bundles
let completedBundles: CompletedBundle[] = [];
const BUNDLES_FILE_PATH = path.join(process.cwd(), 'data', 'completed-bundles.json');

// Function to ensure data directory exists
const ensureDataDirectory = () => {
  const dataDir = path.dirname(BUNDLES_FILE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Function to load existing completed bundles
const loadCompletedBundles = (): CompletedBundle[] => {
  try {
    ensureDataDirectory();
    if (fs.existsSync(BUNDLES_FILE_PATH)) {
      const data = fs.readFileSync(BUNDLES_FILE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    logger.error('Error loading completed bundles:', error);
  }
  return [];
};

// Function to check if a bundle already exists
const bundleExists = (newBundle: CompletedBundle): boolean => {
  return completedBundles.some(existingBundle => 
    existingBundle.originalTweetId === newBundle.originalTweetId &&
    existingBundle.originalUsername === newBundle.originalUsername
  );
};

// Function to save completed bundles
const saveCompletedBundle = (bundle: CompletedBundle) => {
  try {
    ensureDataDirectory();
    
    // Check if this bundle already exists
    if (bundleExists(bundle)) {
      logger.info(`Bundle already exists, skipping: ${bundle.bundle.join(', ')} from @${bundle.originalUsername} (Tweet ID: ${bundle.originalTweetId})`);
      return;
    }
    
    // Add new bundle at the beginning of the array (top of JSON file)
    completedBundles.unshift(bundle);
    fs.writeFileSync(BUNDLES_FILE_PATH, JSON.stringify(completedBundles, null, 2));
    logger.info(`Saved completed bundle: ${bundle.bundle.join(', ')} from @${bundle.originalUsername}`);
    
    // Broadcast the update to all connected clients
    broadcastToBundleHub();
  } catch (error) {
    logger.error('Error saving completed bundle:', error);
  }
};

// Load existing bundles on startup
completedBundles = loadCompletedBundles();
logger.info(`Loaded ${completedBundles.length} existing completed bundles`);

// API functions for accessing completed bundles
export const getCompletedBundles = (): CompletedBundle[] => {
  return [...completedBundles]; // Return a copy to prevent external modification
};

export const getCompletedBundlesByUsername = (username: string): CompletedBundle[] => {
  return completedBundles.filter(bundle => bundle.originalUsername === username);
};

export const getCompletedBundlesByCashtag = (cashtag: string): CompletedBundle[] => {
  return completedBundles.filter(bundle => 
    bundle.bundle.some(tag => tag.toLowerCase() === cashtag.toLowerCase())
  );
};

export const getCompletedBundlesStats = () => {
  const totalBundles = completedBundles.length;
  const uniqueUsers = new Set(completedBundles.map(b => b.originalUsername)).size;
  const allCashtags = completedBundles.flatMap(b => b.bundle);
  const uniqueCashtags = new Set(allCashtags).size;
  const conversationBundles = completedBundles.filter(b => b.conversationType === 'conversation').length;
  const singleTweetBundles = completedBundles.filter(b => b.conversationType === 'single_tweet').length;
  
  return {
    totalBundles,
    uniqueUsers,
    uniqueCashtags,
    conversationBundles,
    singleTweetBundles,
    mostPopularCashtags: getMostPopularCashtags(),
    recentBundles: completedBundles.slice(-10).reverse() // Last 10 bundles
  };
};

const getMostPopularCashtags = () => {
  const cashtagCounts: { [key: string]: number } = {};
  completedBundles.forEach(bundle => {
    bundle.bundle.forEach(cashtag => {
      cashtagCounts[cashtag] = (cashtagCounts[cashtag] || 0) + 1;
    });
  });
  
  return Object.entries(cashtagCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([cashtag, count]) => ({ cashtag, count }));
};

const initCharacter = ({ runtime }: { runtime: IAgentRuntime }) => { //initializes character and needs access to the ElizaOS runtime to properly set up the character
  logger.info('Initializing character');
  logger.info('Name: ', character.name);
    
  // Check for required API keys
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is required. Please add it to your .env file.");
  }
  if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET_KEY || !process.env.TWITTER_ACCESS_TOKEN || !process.env.TWITTER_ACCESS_TOKEN_SECRET) {
    throw new Error("All four Twitter API keys/tokens are required. Please add them to your .env file.");
  }

  logger.info('Character initialization complete');
  
  // Twitter monitoring; elizaos/plugin-twitter is not working as expected, so using direct API calls
  logger.info('Starting DIRECT Twitter monitoring (using home timeline endpoint)...');
  
  const twitterClient = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY!,
    appSecret: process.env.TWITTER_API_SECRET_KEY!,
    accessToken: process.env.TWITTER_ACCESS_TOKEN!,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
  });

  // Helper to pause for a given ms
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Conversation tracking system
  interface ConversationTracker {
    originalTweetId: string;
    originalUsername: string;
    originalCashtag: string;
    startTime: Date;
    isActive: boolean;
    bundle: string[];
  }

  const conversationTrackers = new Map<string, ConversationTracker>();

  // Function to clean up old conversations (older than 1 day)
  const cleanupOldConversations = () => {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    //gets rid of conversations older than 1 day
    for (const [key, tracker] of conversationTrackers.entries()) {
      if (tracker.startTime < oneDayAgo) {
        console.log(`Cleaning up old conversation with @${tracker.originalUsername} (${tracker.originalCashtag})`);
        conversationTrackers.delete(key);
      }
    }
  };

  // Function to extract cashtags from tweet text
  const extractCashtags = (text: string): string[] => {
    const cashtagRegex = /\$[A-Za-z]{1,10}/g;
    const matches = text.match(cashtagRegex);
    return matches ? [...new Set(matches)] : []; // Remove duplicates
  };

  // Function to save a completed bundle
  const saveBundleToStorage = (tracker: ConversationTracker, tweetText?: string, conversationType: 'single_tweet' | 'conversation' = 'conversation', profileImageUrl?: string) => {
    const completedBundle: CompletedBundle = {
      id: `${tracker.originalUsername}_${tracker.originalCashtag}_${Date.now()}`,
      originalTweetId: tracker.originalTweetId,
      originalUsername: tracker.originalUsername,
      originalCashtag: tracker.originalCashtag,
      bundle: [...tracker.bundle], // Create a copy of the bundle array
      completedAt: new Date().toISOString(),
      conversationType,
      tweetText,
      profileImageUrl
    };
    
    saveCompletedBundle(completedBundle);
    console.log(` Saved completed bundle to storage: ${tracker.bundle.join(', ')} from @${tracker.originalUsername}`);
  };

  // Function to generate reply based on cashtags found
  /*const generateReply = async (cashtags: string[], tweetText: string, tweetData: any): Promise<string> => {
    const config = (character.settings as any).twitter.replyConfig;
    
    // FIRST: Check if this user already has an active conversation
    let existingTracker: ConversationTracker | undefined;
    for (const [key, tracker] of conversationTrackers.entries()) {
      if (tracker.originalUsername === tweetData.username && tracker.isActive) {
        existingTracker = tracker;
        break;
      }
    }

    if (existingTracker && existingTracker.isActive) {
      // User has an active conversation - add new cashtags to existing bundle
      const newCashtags = cashtags.filter(cashtag => !existingTracker!.bundle.includes(cashtag));
      
      if (newCashtags.length > 0) {
        existingTracker.bundle.push(...newCashtags);
        console.log(`Bundle created! @${tweetData.username} added ${newCashtags.join(', ')} to ${existingTracker.originalCashtag}`);
        console.log(`Final bundle: ${existingTracker.bundle.join(', ')}`);
        
        // Mark conversation as complete
        existingTracker.isActive = false;
        
        // Save the completed bundle
        saveBundleToStorage(existingTracker, tweetText, 'conversation');
        
        return `Perfect! Your crypto bundle is now: ${existingTracker.bundle.join(', ')}. This is a great combination!`;
      } else {
        // No new cashtags added
        existingTracker.isActive = false;
        
        // Save the completed bundle even if no new cashtags were added
        saveBundleToStorage(existingTracker, tweetText, 'conversation');
        
        return `Thanks for the response! Your bundle remains: ${existingTracker.bundle.join(', ')}.`;
      }
    } else {
      // No active conversation - start new one
      if (cashtags.length === 1) {
        const trackerKey = `${tweetData.username}_${cashtags[0]}`;
        const tracker: ConversationTracker = {
          originalTweetId: tweetData.id_str,
          originalUsername: tweetData.username,
          originalCashtag: cashtags[0],
          startTime: new Date(),
          isActive: true,
          bundle: [cashtags[0]]
        };
        
        conversationTrackers.set(trackerKey, tracker);
        console.log(`Started tracking conversation with @${tweetData.username} for ${cashtags[0]}`);
        
        return config.singleCashtagPrompt.replace('{cashtag}', cashtags[0]);
      } else {
        // Multiple cashtags in first tweet - immediately complete
        const trackerKey = `${tweetData.username}_${cashtags[0]}`;
        const tracker: ConversationTracker = {
          originalTweetId: tweetData.id_str,
          originalUsername: tweetData.username,
          originalCashtag: cashtags[0],
          startTime: new Date(),
          isActive: false, // Already complete
          bundle: cashtags
        };
        
        conversationTrackers.set(trackerKey, tracker);
        console.log(`Created bundle with @${tweetData.username}: ${cashtags.join(', ')}`);
        
        // Save the completed bundle immediately
        saveBundleToStorage(tracker, tweetText, 'single_tweet');
        
        return `Perfect! Your crypto bundle is now: ${cashtags.join(', ')}. This is a great combination!`;
      }
    }
  };*/

  // Function to reply to a tweet
  /*const replyToTweet = async (tweetId: string, replyText: string) => {
    try {
      const reply = await twitterClient.v2.reply(replyText, tweetId);
      logger.info(`Successfully replied to tweet ${tweetId}: ${replyText}`);
      return reply;
    } catch (error) {
      logger.error(`Failed to reply to tweet ${tweetId}:`, error);
      throw error;
    }
  };*/  

  // Main monitoring function using home timeline endpoint
  const startHomeTimelineMonitoring = async () => {
    try {
      logger.info('[HomeTimeline Monitor] Fetching your user ID...');
      const me = await twitterClient.v2.me();
      const myUserId = me.data.id;
      const myUsername = me.data.username;
      logger.info(`[HomeTimeline Monitor] Monitoring home timeline for user ID: ${myUserId} (@${myUsername})`);

      // Track last tweet ID to avoid duplicates
      let lastTweetId: string | undefined = undefined;

      // Monitoring loop
      setInterval(async () => {
        try {
          logger.info('[HomeTimeline Monitor] Checking for new tweets in home timeline...');
          
          // Clean up old conversations first
          cleanupOldConversations();
          
          const requestParams: any = { 
            ...(character.settings as any).twitter.requestParams,
            expansions: ['author_id'],
            'user.fields': ['username', 'profile_image_url']
          };
          if (lastTweetId) requestParams.since_id = lastTweetId;
          
          // Use the home timeline endpoint
          const timeline = await twitterClient.v2.get(`users/${myUserId}/timelines/reverse_chronological`, requestParams);
          
          if (timeline.data && Array.isArray(timeline.data)) {
            const maxDaysBack = (character.settings as any).twitter.monitoringConfig.maxDaysBack;
            
            for (const tweet of timeline.data) {
              const tweetDate = new Date(tweet.created_at);
              const cutoffDate = new Date();
              cutoffDate.setDate(cutoffDate.getDate() - maxDaysBack);
              
              if (tweetDate < cutoffDate) continue;
              
              // Find the username from the includes.users array
              const user = timeline.includes?.users?.find((u: any) => u.id === tweet.author_id);
              const username = user?.username || tweet.author_id;
              
              // Debug: Log user data to see what we're getting
              console.log(`   • User data for @${username}:`, {
                id: user?.id,
                username: user?.username,
                profile_image_url: user?.profile_image_url,
                profile_image_url_https: user?.profile_image_url_https
              });
              
              const tweetData = {
                id_str: tweet.id,
                text: tweet.text,
                username: username,
                author_id: tweet.author_id,
                created_at: tweet.created_at,
                profileImageUrl: user?.profile_image_url_https || user?.profile_image_url || null
              };
              
              // Process the tweet for cashtags
              (global as any).processTweetForCashtags(tweetData, myUsername);
              lastTweetId = tweet.id;
            }
          } else {
            logger.info('[HomeTimeline Monitor] No new tweets found in home timeline.');
          }
        } catch (e) {
          logger.warn('[HomeTimeline Monitor] Error fetching home timeline:', e);
        }
      }, (character.settings as any).twitter.monitoringConfig.checkInterval);

    } catch (e) {
      logger.error('[HomeTimeline Monitor] Failed to initialize monitoring:', e);
      if (e.data) logger.error('Twitter API error details:', JSON.stringify(e.data, null, 2));
    }
  };

  startHomeTimelineMonitoring();

  // Start the standalone BundleHub website
  startBundleHubServer();

  // Process tweets for cashtags and reply if needed
  (global as any).processTweetForCashtags = async (tweetData: any, botUsername: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`\n[${timestamp}] PROCESSING TWEET:`);
    console.log(`   From: @${tweetData.username}`);
    console.log(`   Text: "${tweetData.text}"`);
    console.log(`   Tweet ID: ${tweetData.id_str}`);

    // Add this logging right before the skip check (around line 232):
    console.log(`   • Bot username: @${botUsername}`);
    console.log(`   • Tweet username: @${tweetData.username}`);
    console.log(`   • Username match: ${tweetData.username === botUsername}`);

    // Skip tweets from the bot itself
    if (tweetData.username === botUsername) {
      console.log('   • Skipping tweet from bot itself');
      return;
    }

    // Extract cashtags from the tweet
    const cashtags = extractCashtags(tweetData.text);
    
    if (cashtags.length === 0) {
      console.log('   • No cashtags found, skipping...');
      return;
    }

    console.log(`   • Found ${cashtags.length} cashtag(s): ${cashtags.join(', ')}`);

    // Check if we should process this tweet
    const config = (character.settings as any).twitter.cashtagDetection;
    
    if (cashtags.length < config.minCashtags) {
      console.log(`   • Not enough cashtags (${cashtags.length} < ${config.minCashtags}), skipping...`);
      return;
    }

    if (cashtags.length > config.maxCashtags) {
      console.log(`   • Too many cashtags (${cashtags.length} > ${config.maxCashtags}), skipping...`);
      return;
    }

    // Check if this is a response to our bot (for conversation tracking)
    const isResponseToBot = Array.from(conversationTrackers.values()).some(tracker => 
      tracker.originalUsername === tweetData.username && tracker.isActive
    );
    
    if (isResponseToBot) {
      console.log(`   • Detected response to our single cashtag question from @${tweetData.username}`);
    }

    // Save bundle immediately when cashtags are found (without replying)
    try {
      const bundleId = `${tweetData.username}_${cashtags[0]}_${Date.now()}`;
      const completedBundle: CompletedBundle = {
        id: bundleId,
        originalTweetId: tweetData.id_str,
        originalUsername: tweetData.username,
        originalCashtag: cashtags[0], // Use the first cashtag as the primary one
        bundle: cashtags, // Save all detected cashtags as the bundle
        completedAt: new Date().toISOString(),
        conversationType: cashtags.length > 1 ? 'single_tweet' : 'single_tweet',
        tweetText: tweetData.text,
        profileImageUrl: tweetData.profileImageUrl
      };
      
      saveCompletedBundle(completedBundle);
      console.log(`   •  Saved bundle to JSON: ${cashtags.join(', ')} from @${tweetData.username}`);
      
    } catch (error) {
      console.error('   • ERROR: Failed to save bundle:', error);
    }

    // Generate reply
    /*try {
      const replyText = await generateReply(cashtags, tweetData.text, tweetData);
      
      // Truncate reply if needed
      const maxLength = (character.settings as any).twitter.replyConfig.maxReplyLength;
      const truncatedReply = replyText.length > maxLength 
        ? replyText.substring(0, maxLength - 3) + '...'
        : replyText;

      console.log(`   • Generated reply: ${truncatedReply}`);

      // Send reply if auto-reply is enabled
      if (config.enableAutoReply) {
        console.log(`   • Waiting ${config.replyDelay}ms before replying...`);
        await sleep(config.replyDelay);
        
        try {
          await replyToTweet(tweetData.id_str, truncatedReply);
          console.log(`   • Successfully replied to tweet ${tweetData.id_str}`);
        } catch (replyError) {
          console.error(`   • ERROR: Failed to reply to tweet ${tweetData.id_str}:`, replyError);
        }
      } else {
        console.log('   • Auto-reply disabled, skipping reply...');
      }

    } catch (error) {
      console.error('   • ERROR: Failed to process tweet for cashtags:', error);
    }*/
  };
};

export const projectAgent: ProjectAgent = {
  character,
  init: async (runtime: IAgentRuntime) => await initCharacter({ runtime }),
};

const project: Project = {
  agents: [projectAgent],
};

export default project;