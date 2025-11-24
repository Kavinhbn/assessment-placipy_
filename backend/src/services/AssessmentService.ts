// @ts-nocheck
const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION
});

class AssessmentService {
    private assessmentsTableName: string;

    constructor(tableName: string) {
        // Use separate tables for assessments and questions
        this.assessmentsTableName = process.env.ASSESSMENTS_TABLE_NAME || 'Assesment_placipy_assesments';
    }

    /**
     * Get department code from department name
     */
    private getDepartmentCode(department: string): string {
        if (!department) {
            return 'GEN';
        }

        // Map common department names to codes
        const deptMap: { [key: string]: string } = {
            'Computer Science': 'CSE',
            'Information Technology': 'IT',
            'Electronics': 'ECE',
            'Mechanical': 'ME',
            'Civil': 'CE'
        };

        // Try to find a matching code
        if (deptMap[department]) {
            return deptMap[department];
        } else {
            // Use first 3 characters of department name as fallback
            return department.substring(0, 3).toUpperCase();
        }
    }

    /**
     * Extract domain from email address
     */
    private getDomainFromEmail(email: string): string {
        if (!email || !email.includes('@')) {
            return 'ksrce.ac.in'; // Default domain
        }
        return email.split('@')[1];
    }

    /**
     * Generate entities based on question types with proper batching
     */
    private generateEntities(questions: any[]): any[] {
        const entities: any[] = [];
        const mcqSubcategories = new Set<string>();
        let hasCoding = false;
        let mcqCount = 0;
        let codingCount = 0;

        // Analyze questions to determine entity types and subcategories
        questions.forEach((question) => {
            // Check if this is an MCQ question
            if (question.hasOwnProperty('options') && question.options && question.options.length > 0 && question.options.some((opt: any) => opt.text && opt.text.trim() !== "")) {
                // This is an MCQ question
                mcqCount++;
                const subcategory = question.subcategory || 'technical';
                mcqSubcategories.add(subcategory);
            }
            // Check if this is a Coding question
            else if (question.starterCode && question.starterCode.trim() !== "") {
                // This is a Coding question
                hasCoding = true;
                codingCount++;
            }
        });

        // Add MCQ entity with proper batching (50 questions per batch)
        if (mcqCount > 0) {
            const mcqBatches = Math.ceil(mcqCount / 50);
            for (let i = 1; i <= mcqBatches; i++) {
                entities.push({
                    type: "MCQ",
                    subcategories: Array.from(mcqSubcategories),
                    batch: `mcq_batch_${i}`
                });
            }
        }

        // Add Coding entity (no batching limit)
        if (hasCoding) {
            entities.push({
                type: "Coding",
                description: "Programming questions",
                batch: `programming_batch_1`
            });
        }

        return entities;
    }

    /**
     * Get the next sequential assessment number for a department
     */
    private async getNextAssessmentNumber(deptCode: string): Promise<string> {
        try {
            // Query DynamoDB for assessments with this department code
            // We need to scan since we can't efficiently query by department code in the current structure
            const params = {
                TableName: this.assessmentsTableName,
                FilterExpression: 'SK = :sk AND begins_with(PK, :pk_prefix)',
                ExpressionAttributeValues: {
                    ':sk': 'CLIENT#ksrce.ac.in',
                    ':pk_prefix': 'ASSESSMENT#ASSESS_'
                }
            };

            const result = await dynamodb.scan(params).promise();
            console.log("result", result);
            if (!result.Items || result.Items.length === 0) {
                // No assessments found, start with 001
                console.log("No assessments found, start with 001 - 1");
                return '001';
            }

            // Filter items that match our department code
            const deptAssessments = result.Items.filter(item =>
                item.PK && item.PK.endsWith(`_${deptCode}`)
            );

            if (deptAssessments.length === 0) {
                // No assessments for this department, start with 001
                console.log("No assessments found, start with 001 - 2");
                return '001';
            }

            // Find the highest number and increment
            let maxNumber = 0;
            for (const assessment of deptAssessments) {
                const pk = assessment.PK as string;
                // Extract the number part from ASSESSMENT#ASSESS_XXX_DEPTCODE
                const parts = pk.split('_');
                if (parts.length >= 3) {
                    const numberPart = parts[1]; // The XXX part (index 1, not 2)
                    const number = parseInt(numberPart, 10);
                    if (!isNaN(number) && number > maxNumber) {
                        maxNumber = number;
                    }
                }
            }

            // Return the next number, padded with leading zeros
            return String(maxNumber + 1).padStart(3, '0');
        } catch (error) {
            console.error('Error getting next assessment number:', error);
            // Fallback to 001 if there's an error
            return '001';
        }
    }

    async createAssessment(assessmentData: any, createdBy: string): Promise<any> {
        try {
            console.log('=== Create Assessment Debug Info ===');
            console.log('createdBy parameter:', createdBy);
            console.log('assessmentData.createdByName:', assessmentData.createdByName);
            console.log('Final createdBy value:', createdBy);
            console.log('Final createdByName value:', assessmentData.createdByName || createdBy);
            console.log('Assessments table name:', this.assessmentsTableName);
            console.log('Questions table name:', this.questionsTableName);
            console.log('Received assessmentData:', JSON.stringify(assessmentData, null, 2));

            // Generate a sequential assessment number (001, 002, etc.) per department
            const deptCode = this.getDepartmentCode(assessmentData.department);
            const assessmentNumber = await this.getNextAssessmentNumber(deptCode);

            const assessmentId = `ASSESS_${assessmentNumber}_${deptCode}`;
            const createdAt = new Date().toISOString();
            const domain = this.getDomainFromEmail(createdBy);

            // Create questions array in the new format
            const questions = assessmentData.questions.map((question: any, index: number) => {
                // Create base question structure matching the sample
                const baseQuestion: any = {
                    questionId: `Q_${String(index + 1).padStart(3, '0')}`,
                    questionNumber: index + 1,
                    question: question.text || question.question,
                    points: question.marks || question.points || 1,
                    difficulty: (question.difficulty || assessmentData.difficulty || 'MEDIUM').toUpperCase(),
                    subcategory: question.subcategory || 'technical'
                };

                // Determine question type and structure accordingly
                if (question.hasOwnProperty('options') && question.options && question.options.length > 0) {
                    // This is an MCQ question - match sample format
                    baseQuestion.entityType = 'mcq';
                    baseQuestion.category = 'MCQ';
                    
                    // Format options to match sample structure
                    baseQuestion.options = question.options.map((option: any, optionIndex: number) => {
                        // If options are strings, convert to the required format
                        if (typeof option === 'string') {
                            return {
                                id: String.fromCharCode(65 + optionIndex), // A, B, C, D
                                text: option
                            };
                        }
                        // If options are already in the correct format, use as is
                        return option;
                    });
                    
                    // Handle correct answer - should be an array of strings
                    if (Array.isArray(question.correctAnswer)) {
                        baseQuestion.correctAnswer = question.correctAnswer;
                    } else if (typeof question.correctAnswer === 'string') {
                        baseQuestion.correctAnswer = [question.correctAnswer];
                    } else {
                        baseQuestion.correctAnswer = [];
                    }
                } else if (question.starterCode && question.starterCode.trim() !== "") {
                    // This is a Coding question
                    baseQuestion.entityType = 'coding';
                    baseQuestion.category = 'PROGRAMMING';
                    baseQuestion.starterCode = question.starterCode || '';
                    
                    // Handle test cases if present
                    if (question.testCases && question.testCases.length > 0) {
                        baseQuestion.testCases = question.testCases.map((tc: any) => ({
                            inputs: {
                                input: tc.input
                            },
                            expectedOutput: tc.expectedOutput
                        }));
                    }
                }

                return baseQuestion;
            });

            // Create assessment metadata in assessments table with original structure
            const assessment = {
                PK: `ASSESSMENT#${assessmentId}_MCQ_BATCH_1`, // Updated PK format to match sample
                SK: `CLIENT#${domain}`, // Using dynamic domain from email
                assessmentId: assessmentId, // Keep original field for reference
                title: assessmentData.title,
                description: assessmentData.description || '',
                department: assessmentData.department,
                // Also store department code for easier querying
                departmentCode: deptCode,
                difficulty: assessmentData.difficulty || 'MEDIUM',
                category: "MCQ", // Single category as per sample
                type: "DEPARTMENT_WISE", // Fixed type as per sample
                domain: domain, // Use dynamic domain from email
                entityType: "mcq_batch_1", // Add entityType as per sample
                configuration: {
                    duration: assessmentData.duration || 60,
                    maxAttempts: assessmentData.maxAttempts || 1,
                    passingScore: assessmentData.passingScore || 50,
                    randomizeQuestions: assessmentData.randomizeQuestions || false,
                    totalQuestions: assessmentData.totalQuestions || questions.length
                },
                scheduling: {
                    startDate: assessmentData.scheduling?.startDate,
                    endDate: assessmentData.scheduling?.endDate,
                    timezone: assessmentData.scheduling?.timezone || "Asia/Kolkata"
                },
                target: {
                    departments: assessmentData.targetDepartments || [assessmentData.department],
                    years: assessmentData.targetYears || []
                },
                // Embed questions directly in the assessment item
                questions: questions,
                stats: {
                    avgScore: 0,
                    completed: 0,
                    highestScore: 0,
                    totalParticipants: 0
                },
                status: assessmentData.status || "ACTIVE", // Default to ACTIVE instead of draft
                isPublished: assessmentData.isPublished || false,
                createdBy: createdBy, // Email address
                createdByName: assessmentData.createdByName || createdBy, // Actual name or fallback to email
                createdAt: createdAt,
                updatedAt: createdAt
            };

            // Add publishedAt if assessment is published
            if (assessmentData.isPublished) {
                assessment.publishedAt = assessmentData.publishedAt || new Date().toISOString();
            }

            console.log('Creating assessment item with proper createdBy/createdByName:', {
                createdBy: assessment.createdBy,
                createdByName: assessment.createdByName
            });

            console.log('Creating assessment item:', JSON.stringify(assessment, null, 2));

            // Store assessment metadata in assessments table
            console.log('Attempting to store assessment in table:', this.assessmentsTableName);
            try {
                await dynamodb.put({
                    TableName: this.assessmentsTableName,
                    Item: assessment
                }).promise();
                console.log('Successfully stored assessment in table:', this.assessmentsTableName);
            } catch (dynamoError) {
                console.error('Failed to store assessment in DynamoDB:', dynamoError);
                throw new Error('Failed to store assessment in database: ' + dynamoError.message);
            }

            // Return assessment with questions for the response
            return assessment;
        } catch (error) {
            console.error('Error creating assessment:', error);
            throw new Error('Failed to create assessment: ' + error.message);
        }
    }

    async getAssessmentById(assessmentId: string): Promise<any> {
        try {
            // First, scan to find any assessment with this ID to get the domain
            const scanParams = {
                TableName: this.assessmentsTableName,
                FilterExpression: 'begins_with(PK, :pk_prefix) AND begins_with(SK, :sk_prefix)',
                ExpressionAttributeValues: {
                    ':pk_prefix': `ASSESSMENT#${assessmentId}`,
                    ':sk_prefix': 'CLIENT#'
                }
            };

            const scanResult = await dynamodb.scan(scanParams).promise();

            if (!scanResult.Items || scanResult.Items.length === 0) {
                return null;
            }

            // Return the assessment with embedded questions
            return scanResult.Items[0];
        } catch (error) {
            console.error('Error getting assessment:', error);
            throw new Error('Failed to retrieve assessment: ' + error.message);
        }
    }

    async getAllAssessments(filters: any = {}, limit: number = 50, lastKey: any = null): Promise<any> {
        try {
            // Get all assessments using begins_with filter on PK and SK
            const params: any = {
                TableName: this.assessmentsTableName,
                FilterExpression: 'begins_with(PK, :pk_prefix) AND begins_with(SK, :sk_prefix)',
                ExpressionAttributeValues: {
                    ':pk_prefix': 'ASSESSMENT#',
                    ':sk_prefix': 'CLIENT#'
                },
                Limit: limit
            };

            if (lastKey) {
                params.ExclusiveStartKey = lastKey;
            }

            const result = await dynamodb.scan(params).promise();

            return {
                items: result.Items || [],
                lastKey: result.LastEvaluatedKey,
                hasMore: !!result.LastEvaluatedKey
            };
        } catch (error) {
            console.error('Error getting all assessments:', error);
            throw new Error('Failed to retrieve assessments: ' + error.message);
        }
    }

    async updateAssessment(assessmentId: string, updates: any, updatedBy?: string): Promise<any> {
        try {
            const timestamp = new Date().toISOString();

            // First, get the current item to understand its structure
            // We need to find the assessment by scanning since we don't know the domain
            const getCurrentItemParams = {
                TableName: this.assessmentsTableName,
                FilterExpression: 'begins_with(PK, :pk_prefix) AND begins_with(SK, :sk_prefix)',
                ExpressionAttributeValues: {
                    ':pk_prefix': `ASSESSMENT#${assessmentId}`,
                    ':sk_prefix': 'CLIENT#'
                }
            };

            const currentItemResult = await dynamodb.scan(getCurrentItemParams).promise();
            const currentItem = currentItemResult.Items && currentItemResult.Items[0];

            if (!currentItem) {
                throw new Error('Assessment not found');
            }

            // Build update expression
            const updateExpression = [];
            const expressionAttributeNames: any = {};
            const expressionAttributeValues: any = {};

            Object.keys(updates).forEach((key, index) => {
                const attrName = `#attr${index}`;
                const attrValue = `:val${index}`;
                updateExpression.push(`${attrName} = ${attrValue}`);
                expressionAttributeNames[attrName] = key;
                expressionAttributeValues[attrValue] = updates[key];
            });

            updateExpression.push('#updatedAt = :updatedAt');
            expressionAttributeNames['#updatedAt'] = 'updatedAt';
            expressionAttributeValues[':updatedAt'] = timestamp;

            // Add updatedBy if provided
            if (updatedBy) {
                updateExpression.push('#updatedBy = :updatedBy');
                expressionAttributeNames['#updatedBy'] = 'updatedBy';
                expressionAttributeValues[':updatedBy'] = updatedBy;
                // Also add updatedByName if it exists in updates
                if (updates.updatedByName) {
                    updateExpression.push('#updatedByName = :updatedByName');
                    expressionAttributeNames['#updatedByName'] = 'updatedByName';
                    expressionAttributeValues[':updatedByName'] = updates.updatedByName;
                }
            }

            const params = {
                TableName: this.assessmentsTableName,
                Key: {
                    PK: currentItem.PK,
                    SK: currentItem.SK
                },
                UpdateExpression: `SET ${updateExpression.join(', ')}`,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
                ReturnValues: 'ALL_NEW'
            };

            const result = await dynamodb.update(params).promise();
            return result.Attributes;
        } catch (error) {
            console.error('Error updating assessment:', error);
            throw new Error('Failed to update assessment: ' + error.message);
        }
    }

    async deleteAssessment(assessmentId: string): Promise<void> {
        try {
            // First, find the assessment to get its PK and SK
            const getAssessmentParams = {
                TableName: this.assessmentsTableName,
                FilterExpression: 'begins_with(PK, :pk_prefix) AND begins_with(SK, :sk_prefix)',
                ExpressionAttributeValues: {
                    ':pk_prefix': `ASSESSMENT#${assessmentId}`,
                    ':sk_prefix': 'CLIENT#'
                }
            };

            const assessmentResult = await dynamodb.scan(getAssessmentParams).promise();
            const assessment = assessmentResult.Items && assessmentResult.Items[0];

            if (!assessment) {
                throw new Error('Assessment not found');
            }

            // Delete assessment from assessments table
            const assessmentParams = {
                TableName: this.assessmentsTableName,
                Key: {
                    PK: assessment.PK,
                    SK: assessment.SK
                }
            };

            await dynamodb.delete(assessmentParams).promise();

            // Delete associated questions from questions table
            // Delete all questions with the same base PK and SK
            const questionsParams = {
                TableName: this.questionsTableName,
                FilterExpression: 'begins_with(PK, :pk_prefix) AND SK = :sk',
                ExpressionAttributeValues: {
                    ':pk_prefix': `ASSESSMENT#${assessmentId}`,
                    ':sk': assessment.SK
                }
            };

            const questionsResult = await dynamodb.scan(questionsParams).promise();
            const questions = questionsResult.Items || [];

            // Delete each question
            for (const question of questions) {
                const deleteParams = {
                    TableName: this.questionsTableName,
                    Key: {
                        PK: question.PK,
                        SK: question.SK
                    }
                };
                await dynamodb.delete(deleteParams).promise();
            }
        } catch (error) {
            console.error('Error deleting assessment:', error);
            throw new Error('Failed to delete assessment: ' + error.message);
        }
    }
}

module.exports = new AssessmentService(process.env.DYNAMODB_TABLE_NAME || 'Assesment_placipy');