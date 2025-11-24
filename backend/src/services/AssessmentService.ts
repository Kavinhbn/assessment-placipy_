// @ts-nocheck
const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION
});

class AssessmentService {
    private assessmentsTableName: string;
    private questionsTableName: string;

    constructor(tableName: string) {
        // Use separate tables for assessments and questions
        this.assessmentsTableName = process.env.ASSESSMENTS_TABLE_NAME || 'Assesment_placipy_assesments';
        this.questionsTableName = process.env.QUESTIONS_TABLE_NAME || 'Assessment_placipy_assesessment_questions';
    }

    async createAssessment(assessmentData: any, createdBy: string): Promise<any> {
        try {
            const timestamp = Date.now();
            const createdAt = new Date().toISOString();
            // Generate assessment ID in the format ASSESS_001_MULT
            const assessmentId = `ASSESS_${timestamp.toString().slice(-6)}_MULT`;
            const totalMarks = assessmentData.questions.reduce((sum: number, q: any) => sum + (q.marks || 1), 0);

            // Create questions array in the new format
            const questions = assessmentData.questions.map((question: any, index: number) => {
                const baseQuestion: any = {
                    questionId: `Q_${String(index + 1).padStart(3, '0')}`,
                    questionNumber: index + 1,
                    question: question.text,
                    points: question.marks || 1,
                    difficulty: (assessmentData.difficulty || 'medium').toUpperCase(),
                    entityType: 'coding'
                };

                // Add type-specific fields
                if (assessmentData.category === "Programming (Any Language)") {
                    baseQuestion.entityType = 'coding';
                    baseQuestion.category = 'PROGRAMMING';
                    baseQuestion.language = 'python'; // Default language, can be made configurable
                    baseQuestion.starterCode = '# Write your code here';
                    if (question.testCases && question.testCases.length > 0) {
                        baseQuestion.testCases = question.testCases.map((tc: any) => ({
                            inputs: {
                                input: tc.input
                            },
                            expectedOutput: tc.expectedOutput
                        }));
                    }
                } else {
                    baseQuestion.entityType = 'mcq';
                    baseQuestion.category = 'MCQ';
                    baseQuestion.options = question.options || [];
                    baseQuestion.correctAnswer = question.correctAnswer;
                }

                return baseQuestion;
            });

            // Create assessment metadata in assessments table with new structure
            const assessment = {
                PK: `ASSESSMENT#${assessmentId}`, // Using PK with prefix as shown in example
                SK: `CLIENT#ksrce.ac.in`, // Using CLIENT#ksrce.ac.in as SK as requested
                assessmentId: assessmentId, // Keep original field for reference
                title: assessmentData.title,
                description: assessmentData.description || '',
                duration: assessmentData.duration,
                totalMarks,
                instructions: assessmentData.instructions || '',
                department: assessmentData.department,
                entityType: 'coding_batch_1', // As shown in example
                questions: questions, // Include questions in the same item
                difficulty: assessmentData.difficulty || 'medium',
                category: assessmentData.category || '',
                mcqSubcategory: assessmentData.mcqSubcategory || '', // Add subcategory field
                negativeMarking: assessmentData.negativeMarking || 0,
                referenceMaterials: assessmentData.referenceMaterials || [],
                questionCount: assessmentData.questions.length,
                status: 'draft',
                createdBy,
                createdAt,
                updatedAt: createdAt
            };

            console.log('Creating assessment item:', JSON.stringify(assessment, null, 2));

            await dynamodb.put({
                TableName: this.assessmentsTableName,
                Item: assessment
            }).promise();

            return assessment;
        } catch (error) {
            console.error('Error creating assessment:', error);
            throw new Error('Failed to create assessment: ' + error.message);
        }
    }

    async getAssessmentById(assessmentId: string): Promise<any> {
        try {
            // Get assessment metadata from assessments table
            const assessmentParams = {
                TableName: this.assessmentsTableName,
                KeyConditionExpression: 'PK = :pk AND SK = :sk',
                ExpressionAttributeValues: {
                    ':pk': `ASSESSMENT#${assessmentId}`,
                    ':sk': `CLIENT#ksrce.ac.in`
                }
            };

            const assessmentResult = await dynamodb.query(assessmentParams).promise();

            if (!assessmentResult.Items || assessmentResult.Items.length === 0) {
                return null;
            }

            // Return the assessment with embedded questions
            return assessmentResult.Items[0];
        } catch (error) {
            console.error('Error getting assessment:', error);
            throw new Error('Failed to retrieve assessment: ' + error.message);
        }
    }

    async getAllAssessments(filters: any = {}, limit: number = 50, lastKey: any = null): Promise<any> {
        try {
            // Get all assessments using begins_with filter on PK
            const params: any = {
                TableName: this.assessmentsTableName,
                KeyConditionExpression: 'begins_with(PK, :pk_prefix) AND SK = :sk',
                ExpressionAttributeValues: {
                    ':pk_prefix': 'ASSESSMENT#',
                    ':sk': 'CLIENT#ksrce.ac.in'
                },
                Limit: limit
            };

            if (lastKey) {
                params.ExclusiveStartKey = lastKey;
            }

            const result = await dynamodb.query(params).promise();

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

    async updateAssessment(assessmentId: string, updates: any): Promise<any> {
        try {
            const timestamp = new Date().toISOString();
            
            // First, get the current item to understand its structure
            const getCurrentItemParams = {
                TableName: this.assessmentsTableName,
                KeyConditionExpression: 'PK = :pk AND SK = :sk',
                ExpressionAttributeValues: {
                    ':pk': `ASSESSMENT#${assessmentId}`,
                    ':sk': `CLIENT#ksrce.ac.in`
                }
            };
            
            const currentItemResult = await dynamodb.query(getCurrentItemParams).promise();
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

            const params = {
                TableName: this.assessmentsTableName,
                Key: {
                    PK: `ASSESSMENT#${assessmentId}`,
                    SK: `CLIENT#ksrce.ac.in`
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
            // Delete assessment from assessments table
            const assessmentParams = {
                TableName: this.assessmentsTableName,
                Key: {
                    PK: `ASSESSMENT#${assessmentId}`,
                    SK: `CLIENT#ksrce.ac.in`
                }
            };

            await dynamodb.delete(assessmentParams).promise();
        } catch (error) {
            console.error('Error deleting assessment:', error);
            throw new Error('Failed to delete assessment: ' + error.message);
        }
    }
}

module.exports = new AssessmentService(process.env.DYNAMODB_TABLE_NAME || 'Assesment_placipy');