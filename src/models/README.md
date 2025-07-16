# Farm Connect - Database Models

This directory contains all Sequelize models for the Farm Connect application.

## 📊 **Model Overview**

### **Core User Management**
- **User** - Main user entity with profile and gamification
- **Role** - User roles (farmer, veterinarian, extension officer, etc.)
- **Level** - Gamification levels based on points
- **Resource/Action** - RBAC permission components
- **Permission** - Combines Resource + Action for granular control
- **RolePermission** - Junction table for Role ↔ Permission many-to-many

### **Content Management**
- **Content** - Main posts/discussions with hierarchical structure
- **ContentMediaFile** - Media attachments (images, videos, documents)
- **ContentReaction** - User reactions (like, dislike, helpful, etc.)
- **PostTag** - Content categorization tags
- **ContentTagAssignment** - Junction table for Content ↔ Tag many-to-many

### **Knowledge Base**
- **BestPracticeContent** - Educational content for farmers
- **BestPracticeTag** - Best practice categorization

### **Assessment System**
- **Quiz** - Knowledge assessments linked to best practices

## 🔗 **Key Relationships**

### **User Relationships**
```typescript
User → Role (belongsTo)
User → Level (belongsTo)
User → Content (hasMany)
User → BestPracticeContent (hasMany)
User → Quiz (hasMany)
User → ContentReaction (hasMany)
```

### **Content Relationships**
```typescript
Content → User (belongsTo)
Content → Content (self-referencing for replies)
Content → ContentMediaFile (hasMany)
Content → ContentReaction (hasMany)
Content ↔ PostTag (belongsToMany through ContentTagAssignment)
```

### **Permission System**
```typescript
Role ↔ Permission (belongsToMany through RolePermission)
Permission → Resource (belongsTo)
Permission → Action (belongsTo)
```

## 🚀 **Usage**

### **Import Models**
```typescript
import { User, Content, Role, syncDatabase } from './models';
```

### **Database Sync**
```typescript
import { syncDatabase } from './models';

// Sync all models (development only)
await syncDatabase(true); // force: true will drop and recreate tables
```

### **Model Usage Examples**
```typescript
// Create user with role and level
const user = await User.create({
  firstname: 'John',
  lastname: 'Doe',
  email: 'john@example.com',
  username: 'johndoe',
  password: 'hashedPassword',
  role_id: 1,
  level_id: 1
});

// Get user with relationships
const userWithRole = await User.findByPk(1, {
  include: ['role', 'level']
});

// Create content with tags
const content = await Content.create({
  title: 'Pig Feeding Best Practices',
  text_content: 'Here are some important feeding tips...',
  user_id: 1
});
```

## 📝 **Model Features**

### **Automatic Timestamps**
All models include `created_at` and `updated_at` timestamps.

### **Soft Deletes**
Some models use soft deletes with `is_deleted` or `is_active` flags.

### **Validation**
Models include validation for:
- Email format
- Required fields
- Unique constraints
- Value ranges (e.g., quiz passing scores 0-100)

### **Indexes**
Optimized indexes on:
- Foreign keys
- Frequently queried fields
- Unique constraints
- Composite indexes for performance

## 🔧 **Configuration**

Models are configured with:
- **underscored: true** - Uses snake_case for database columns
- **timestamps: true** - Automatic created_at/updated_at
- **paranoid: false** - Using custom soft delete implementation
