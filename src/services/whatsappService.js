/**
 * WhatsApp Service - Handles all WhatsApp operations
 */

class WhatsAppService {
  constructor(client) {
    this.client = client;
    this.rateLimitDelay = 1000; // Default 1 second between operations
  }

  /**
   * Verify if a number is registered on WhatsApp
   * @param {string} number - Phone number in format 201xxxxxxxx
   * @returns {Promise<boolean>} - True if registered, false otherwise
   */
  async verifyNumber(number) {
    try {
      const chatId = `${number}@c.us`;
      const isRegistered = await this.client.isRegisteredUser(chatId);
      return isRegistered;
    } catch (err) {
      console.warn(`Failed to verify ${number}:`, err.message);
      return false;
    }
  }

  /**
   * Verify multiple numbers with progress callback
   * @param {Array<string>} numbers - Array of phone numbers
   * @param {Function} progressCallback - Called with progress updates
   * @returns {Promise<object>} - Verification results
   */
  async verifyNumbers(numbers, progressCallback = () => {}) {
    const results = {
      verified: [],
      unregistered: [],
      errors: []
    };

    for (let i = 0; i < numbers.length; i++) {
      const number = numbers[i];
      progressCallback({
        current: i + 1,
        total: numbers.length,
        number,
        status: 'verifying'
      });

      try {
        const isRegistered = await this.verifyNumber(number);
        if (isRegistered) {
          results.verified.push(number);
          progressCallback({ status: 'verified', number });
        } else {
          results.unregistered.push(number);
          progressCallback({ status: 'unregistered', number });
        }
      } catch (err) {
        results.errors.push({ number, error: err.message });
        progressCallback({ status: 'error', number, error: err.message });
      }

      // Rate limiting
      if (i < numbers.length - 1) {
        await this.delay(this.rateLimitDelay);
      }
    }

    return results;
  }

  /**
   * Create a WhatsApp group
   * @param {string} groupName - Name of the group
   * @param {Array<string>} participants - Array of WhatsApp IDs (number@c.us)
   * @returns {Promise<object>} - Group creation result
   */
  async createGroup(groupName, participants) {
    if (!participants || participants.length === 0) {
      throw new Error('At least one participant is required');
    }

    try {
      const groupResult = await this.client.createGroup(groupName, [participants[0]]);
      return {
        groupId: groupResult.gid._serialized,
        groupName,
        initialParticipant: participants[0],
        remainingParticipants: participants.slice(1)
      };
    } catch (err) {
      throw new Error(`Failed to create group "${groupName}": ${err.message}`);
    }
  }

  /**
   * Add participants to an existing group
   * @param {string} groupId - Group ID
   * @param {Array<string>} participants - Array of WhatsApp IDs to add
   * @param {Function} progressCallback - Called with progress updates
   * @returns {Promise<object>} - Addition results
   */
  async addParticipantsToGroup(groupId, participants, progressCallback = () => {}) {
    const results = {
      successful: [],
      failed: [],
      totalAttempted: participants.length
    };

    if (participants.length === 0) {
      return results;
    }

    try {
      const groupChat = await this.client.getChatById(groupId);

      for (let i = 0; i < participants.length; i++) {
        const participant = participants[i];
        
        progressCallback({
          current: i + 1,
          total: participants.length,
          participant,
          status: 'adding'
        });

        try {
          await groupChat.addParticipants([participant]);
          results.successful.push(participant);
          progressCallback({ status: 'added', participant });
        } catch (err) {
          results.failed.push({ participant, error: err.message });
          progressCallback({ status: 'failed', participant, error: err.message });
        }

        // Rate limiting between additions
        if (i < participants.length - 1) {
          await this.delay(2000); // 2 seconds between additions
        }
      }
    } catch (err) {
      throw new Error(`Failed to access group ${groupId}: ${err.message}`);
    }

    return results;
  }

  /**
   * Complete group creation workflow
   * @param {string} groupName - Name of the group
   * @param {Array<string>} verifiedNumbers - Array of verified WhatsApp IDs
   * @param {Function} progressCallback - Called with progress updates
   * @returns {Promise<object>} - Complete operation results
   */
  async createGroupWithParticipants(groupName, verifiedNumbers, progressCallback = () => {}) {
    if (verifiedNumbers.length === 0) {
      throw new Error('No verified numbers available');
    }

    progressCallback({ status: 'creating-group', groupName });

    // Create group with first participant
    const groupInfo = await this.createGroup(groupName, verifiedNumbers);
    
    progressCallback({ 
      status: 'group-created', 
      groupName, 
      groupId: groupInfo.groupId,
      participantCount: verifiedNumbers.length
    });

    // Add remaining participants
    const addResults = await this.addParticipantsToGroup(
      groupInfo.groupId, 
      groupInfo.remainingParticipants, 
      progressCallback
    );

    return {
      groupInfo,
      addResults,
      summary: {
        totalNumbers: verifiedNumbers.length,
        successful: addResults.successful.length + 1, // +1 for initial participant
        failed: addResults.failed.length
      }
    };
  }

  /**
   * Utility method for delays
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set rate limiting delay
   * @param {number} delay - Delay in milliseconds
   */
  setRateLimitDelay(delay) {
    this.rateLimitDelay = delay;
  }
}

module.exports = WhatsAppService;