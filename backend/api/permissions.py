"""
Custom permission classes for role-based access control.
"""
from rest_framework import permissions
from .models import UserRole, UserProfile


class IsAdmin(permissions.BasePermission):
    """Permission to only allow admin users."""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if hasattr(request.user, 'profile'):
            return request.user.profile.is_admin
        return False


class IsContributor(permissions.BasePermission):
    """Permission to allow contributors."""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if hasattr(request.user, 'profile'):
            return request.user.profile.is_contributor or request.user.profile.is_admin
        return False


class IsReviewer(permissions.BasePermission):
    """Permission to allow reviewers."""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if hasattr(request.user, 'profile'):
            return request.user.profile.is_reviewer or request.user.profile.is_admin
        return False


class IsProjectOwner(permissions.BasePermission):
    """Permission to only allow project owners."""
    
    def has_object_permission(self, request, view, obj):
        # For Project objects
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        # For Indicator objects (check via project)
        if hasattr(obj, 'project'):
            return obj.project.owner == request.user
        # For Evidence objects (check via indicator -> project)
        if hasattr(obj, 'indicator'):
            return obj.indicator.project.owner == request.user
        return False


class IsProjectMember(permissions.BasePermission):
    """Permission to allow project members (read) and owners (write)."""
    
    def has_object_permission(self, request, view, obj):
        # Admin can do anything
        if hasattr(request.user, 'profile') and request.user.profile.is_admin:
            return True
        
        # Get project from object
        project = None
        if hasattr(obj, 'project'):
            project = obj.project
        elif hasattr(obj, 'indicator'):
            project = obj.indicator.project
        
        if not project:
            return False
        
        # Owner can do anything
        if project.owner == request.user:
            return True
        
        # Members can read, but only owners can write
        if request.method in permissions.SAFE_METHODS:
            return project.members.filter(id=request.user.id).exists()
        
        return False


class IsProjectOwnerOrReadOnly(permissions.BasePermission):
    """Permission to allow read for members, write for owners."""
    
    def has_permission(self, request, view):
        # Allow read for authenticated users
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        # Write requires authentication
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Admin can do anything
        if hasattr(request.user, 'profile') and request.user.profile.is_admin:
            return True
        
        # Get project from object
        project = None
        if hasattr(obj, 'members') and hasattr(obj, 'owner'):
            project = obj
        elif hasattr(obj, 'project'):
            project = obj.project
        elif hasattr(obj, 'indicator'):
            project = obj.indicator.project
        
        if not project:
            return False
        
        # Owner can do anything
        if project.owner == request.user:
            return True
        
        # Members can read
        if request.method in permissions.SAFE_METHODS:
            return project.members.filter(id=request.user.id).exists()
        
        return False


class IsAuthenticatedReadOnly(permissions.BasePermission):
    """Permission to allow read for authenticated users, write for owners/admins."""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Read allowed for authenticated users
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write requires ownership or admin
        if hasattr(request.user, 'profile') and request.user.profile.is_admin:
            return True
        
        # Check if user is owner
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        if hasattr(obj, 'project') and hasattr(obj.project, 'owner'):
            return obj.project.owner == request.user
        
        return False

