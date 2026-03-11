import SEOHead from '@/components/SEOHead';
import { useI18n } from '@/hooks/useI18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TermsOfService = () => {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <SEOHead 
        title="Terms of Service - CarKeeper"
        description="Read CarKeeper's terms of service and user agreement. Understand your rights and responsibilities when using our car management platform."
        keywords="terms of service, user agreement, car management terms, service conditions"
      />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to App
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Terms of Service</CardTitle>
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none dark:prose-invert">
            <h2>1. Agreement to Terms</h2>
            <p>
              By accessing and using CarKeeper, you accept and agree to be bound by the terms and 
              provision of this agreement.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              CarKeeper is a digital car management platform that allows users to track vehicle 
              maintenance, expenses, documents, and reminders. The service is provided "as is" 
              and we reserve the right to modify or discontinue features at any time.
            </p>

            <h2>3. User Account</h2>
            <h3>3.1 Account Creation</h3>
            <ul>
              <li>You must provide accurate and complete information</li>
              <li>You are responsible for maintaining account security</li>
              <li>One account per user</li>
              <li>You must be 13 years or older to create an account</li>
            </ul>

            <h3>3.2 Account Responsibilities</h3>
            <ul>
              <li>Keep your login credentials secure</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>You are responsible for all activities under your account</li>
            </ul>

            <h2>4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the service for illegal purposes</li>
              <li>Upload malicious files or viruses</li>
              <li>Attempt to gain unauthorized access to other accounts</li>
              <li>Share false or misleading information</li>
              <li>Reverse engineer or copy our software</li>
            </ul>

            <h2>5. User Content</h2>
            <h3>5.1 Ownership</h3>
            <p>
              You retain ownership of all content you upload to CarKeeper, including vehicle 
              information, documents, and images.
            </p>

            <h3>5.2 License to Use</h3>
            <p>
              By uploading content, you grant us a license to store, process, and display your 
              content solely for the purpose of providing our services to you.
            </p>

            <h3>5.3 Content Restrictions</h3>
            <ul>
              <li>Content must be legal and not infringe on others' rights</li>
              <li>No copyrighted material without permission</li>
              <li>No personal information of others without consent</li>
            </ul>

            <h2>6. Service Availability</h2>
            <p>
              We strive to provide reliable service but cannot guarantee 100% uptime. We may 
              perform maintenance that temporarily affects service availability.
            </p>

            <h2>7. Data Backup and Loss</h2>
            <p>
              While we implement backup procedures, you are responsible for maintaining your own 
              backups of important data. We are not liable for data loss.
            </p>

            <h2>8. Privacy</h2>
            <p>
              Your privacy is important to us. Please review our Privacy Policy to understand 
              how we collect, use, and protect your information.
            </p>

            <h2>9. Limitation of Liability</h2>
            <p>
              CarKeeper shall not be liable for any indirect, incidental, special, consequential, 
              or punitive damages resulting from your use of the service.
            </p>

            <h2>10. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless CarKeeper from any claims arising from your 
              use of the service or violation of these terms.
            </p>

            <h2>11. Termination</h2>
            <h3>11.1 By You</h3>
            <p>You may terminate your account at any time by deleting it through the app settings.</p>

            <h3>11.2 By Us</h3>
            <p>
              We may terminate accounts that violate these terms or for any reason with reasonable notice.
            </p>

            <h2>12. Governing Law</h2>
            <p>
              These terms are governed by the laws of the jurisdiction where CarKeeper is operated, 
              without regard to conflict of law principles.
            </p>

            <h2>13. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Users will be notified of 
              significant changes via email or app notification.
            </p>

            <h2>14. Contact Information</h2>
            <p>
              For questions about these terms, contact us at:
              <br />
              Email: legal@carkeeper.app
            </p>

            <h2>15. Severability</h2>
            <p>
              If any provision of these terms is found to be unenforceable, the remaining provisions 
              will continue in full force and effect.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;