import { db } from '@/db';
import { documents, analysisResults } from '@/db/schema';

async function main() {
    const sampleDocuments = [
        {
            filename: 'Acme-Contract.pdf',
            text: 'SERVICE AGREEMENT This Service Agreement ("Agreement") is entered into as of January 15, 2025, by and between Acme Corporation, a Delaware corporation with its principal place of business at 123 Business Street, Suite 100, New York, NY 10001 ("Client"), and Tech Solutions LLC, a California limited liability company with its principal place of business at 456 Innovation Drive, San Francisco, CA 94105 ("Service Provider"). Client and Service Provider may be referred to individually as a "Party" and collectively as the "Parties."',
            createdAt: Date.now() - 86400000 * 5, // 5 days ago
        },
        {
            filename: 'Invoice-2025-001.pdf',
            text: 'INVOICE Invoice #: 2025-001 Invoice Date: January 20, 2025 Due Date: February 20, 2025 Bill To: Global Enterprises Inc. 789 Corporate Plaza Boston, MA 02108 Description: Software Development Services - Phase 1 Completion Quantity: 1 Rate: $25,000.00 Subtotal: $25,000.00 Sales Tax (6.25%): $1,562.50 Total Amount Due: $26,562.50 Payment Terms: Net 30',
            createdAt: Date.now() - 86400000 * 4, // 4 days ago
        },
        {
            filename: 'Meeting-Notes-Q1.docx',
            text: 'Q1 STRATEGIC PLANNING MEETING NOTES Date: Tuesday, January 14, 2025 Time: 2:00 PM - 4:30 PM Location: Executive Conference Room Attendees: Sarah Johnson (CEO), Michael Chen (CTO), Lisa Rodriguez (CFO), David Park (VP Marketing), Amanda Foster (VP Sales) AGENDA: 1. Q4 2024 Performance Review 2. Q1 2025 Goals & Objectives 3. Budget Allocation & Resource Planning 4. Product Roadmap Discussion 5. Market Expansion Strategy ACTION ITEMS: Sarah Johnson - Finalize Q1 budget proposal by January 25th',
            createdAt: Date.now() - 86400000 * 3, // 3 days ago
        },
        {
            filename: 'Budget-Proposal-2025.xlsx',
            text: 'FY 2025 BUDGET PROPOSAL Executive Summary: Company proposes a total operating budget of $12.5M for fiscal year 2025, representing a 15% increase from FY 2024. Budget allocations by department: Engineering: $4.2M (34%), Sales & Marketing: $3.1M (25%), Operations: $2.8M (22%), Administration: $1.8M (14%), R&D: $0.6M (5%). Key initiatives include product development, market expansion, and infrastructure improvements. Revenue projection: $18.2M, Net profit margin target: 20%',
            createdAt: Date.now() - 86400000 * 2, // 2 days ago
        },
        {
            filename: 'Employee-Handbook.pdf',
            text: 'EMPLOYEE HANDBOOK 2025 Welcome to TechCorp Solutions. This handbook serves as your guide to our company policies, procedures, and expectations. EQUAL OPPORTUNITY EMPLOYER: We are committed to providing equal employment opportunities to all employees and applicants without regard to race, color, religion, sex, national origin, age, disability, or genetic information. WORK SCHEDULE: Standard business hours are Monday through Friday, 9:00 AM to 5:00 PM with one hour for lunch. BENEFITS: Comprehensive health insurance, dental coverage, 401(k) retirement plan, professional development opportunities, and employee stock purchase program.',
            createdAt: Date.now() - 86400000 * 1, // 1 day ago
        }
    ];

    await db.insert(documents).values(sampleDocuments);

    const sampleAnalysisResults = [
        {
            docId: 1,
            resultJson: JSON.stringify({
                sentiment: 'neutral',
                confidence: 0.92,
                classification: 'legal_document',
                key_findings: ['Service Provider obligations', 'Contract duration', 'Payment terms'],
                entities: ['Acme Corporation', 'Tech Solutions LLC'],
                summary: 'Legal service agreement between two companies'
            }),
            createdAt: Date.now() - 43200000, // 12 hours ago
        },
        {
            docId: 3,
            resultJson: JSON.stringify({
                sentiment: 'positive',
                confidence: 0.85,
                classification: 'meeting_minutes',
                key_findings: ['Q1 goals alignment', 'Budget approval needed', 'Action items assigned'],
                entities: ['Sarah Johnson', 'Michael Chen', 'Lisa Rodriguez', 'Q1 2025'],
                summary: 'Strategic planning meeting with clear objectives and assigned responsibilities'
            }),
            createdAt: Date.now() - 21600000, // 6 hours ago
        }
    ];

    await db.insert(analysisResults).values(sampleAnalysisResults);
    
    console.log('✅ Documents and analysis results seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});