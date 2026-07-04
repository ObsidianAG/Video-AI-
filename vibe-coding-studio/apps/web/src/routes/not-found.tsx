import { Link } from '@tanstack/react-router'
import { Button } from '../components/ui/button'
import { Card, CardBody } from '../components/ui/card'
import { Home } from 'lucide-react'

export function NotFoundRoute() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card>
        <CardBody className="text-center py-12 px-8">
          <h1 className="text-6xl font-bold mb-4 text-[var(--primary)]">404</h1>
          <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
          <p className="text-gray-400 mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link to="/">
            <Button>
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </CardBody>
      </Card>
    </div>
  )
}
