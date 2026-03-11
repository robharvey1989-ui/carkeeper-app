import SEOHead from '@/components/SEOHead';
import { useI18n } from '@/hooks/useI18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PrivacyPolicy = () => {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <SEOHead 
        title="Privacy Policy - CarKeeper"
        description="Learn how CarKeeper protects your personal information and vehicle data. Read our comprehensive privacy policy."
        keywords="privacy policy, data protection, GDPR, car data privacy, personal information"
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
            <CardTitle className="text-3xl font-bold">Privacy Policy</CardTitle>
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none dark:prose-invert">
            <h2>1. Information We Collect</h2>
            <p>
              CarKeeper collects information you provide directly to us, such as when you create an account, 
              add vehicle information, upload documents, or contact us for support.
            </p>
            
            <h3>1.1 Vehicle Information</h3>
            <ul>
              <li>Vehicle details (make, model, year, registration)</li>
              <li>Maintenance records and schedules</li>
              <li>Expense tracking data</li>
              <li>Mileage logs</li>
              <li>Vehicle documents and images</li>
            </ul>

            <h3>1.2 Account Information</h3>
            <ul>
              <li>Email address</li>
              <li>Account preferences (language, currency, units)</li>
              <li>Authentication data</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide and maintain our services</li>
              <li>Send you reminders and notifications</li>
              <li>Improve our application functionality</li>
              <li>Respond to your comments and questions</li>
              <li>Ensure data security and prevent fraud</li>
            </ul>

            <h2>3. Information Sharing</h2>
            <p>
              We do not sell, trade, or otherwise transfer your personal information to third parties. 
              Your vehicle data remains private and is only accessible to you.
            </p>

            <h2>4. Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information against 
              unauthorized access, alteration, disclosure, or destruction. All data is encrypted and 
              stored securely using industry-standard practices.
            </p>

            <h2>5. Your Rights (GDPR Compliance)</h2>
            <p>If you are located in the European Union, you have the following rights:</p>
            <ul>
              <li>Right to access your personal data</li>
              <li>Right to rectification of inaccurate data</li>
              <li>Right to erasure of your data</li>
              <li>Right to restrict processing</li>
              <li>Right to data portability</li>
              <li>Right to object to processing</li>
            </ul>

            <h2>6. Data Retention</h2>
            <p>
              We retain your information for as long as your account is active or as needed to provide 
              you services. You may delete your account and all associated data at any time.
            </p>

            <h2>7. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your own. 
              We ensure appropriate safeguards are in place for such transfers.
            </p>

            <h2>8. Children's Privacy</h2>
            <p>
              Our service is not intended for children under 13. We do not knowingly collect personal 
              information from children under 13.
            </p>

            <h2>9. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of any changes 
              by posting the new privacy policy on this page.
            </p>

            <h2>10. Contact Us</h2>
            <p>
              If you have any questions about this privacy policy, please contact us at: 
              <br />
              Email: privacy@carkeeper.app
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;