"""
Custom middleware for monitoring and request tracking.
"""
import time
import logging
import uuid
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class RequestTimingMiddleware(MiddlewareMixin):
    """Middleware to track request duration and log slow queries"""
    
    SLOW_REQUEST_THRESHOLD = 1.0  # 1 second
    
    def process_request(self, request):
        """Store request start time"""
        request.start_time = time.time()
        # Generate request ID for tracing
        request.request_id = str(uuid.uuid4())[:8]
        return None
    
    def process_response(self, request, response):
        """Log request duration and slow requests"""
        if hasattr(request, 'start_time'):
            duration = time.time() - request.start_time
            
            # Log slow requests
            if duration > self.SLOW_REQUEST_THRESHOLD:
                logger.warning(
                    f"Slow request detected: {request.method} {request.path} "
                    f"took {duration:.2f}s (request_id: {request.request_id})"
                )
            
            # Log AI endpoint requests (they tend to be slower)
            if '/api/analyze' in request.path or '/api/ask-assistant' in request.path:
                logger.info(
                    f"AI endpoint: {request.method} {request.path} "
                    f"took {duration:.2f}s (request_id: {request.request_id})"
                )
            
            # Add request ID to response headers for tracing
            response['X-Request-ID'] = request.request_id
        
        return response


class RequestIDMiddleware(MiddlewareMixin):
    """Middleware to add request ID to all requests for tracing"""
    
    def process_request(self, request):
        """Add request ID if not already present"""
        if not hasattr(request, 'request_id'):
            request.request_id = str(uuid.uuid4())[:8]
        return None

