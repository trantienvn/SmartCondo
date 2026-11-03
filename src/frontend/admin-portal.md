# Admin/Management Portal - SmartCondo

## Page Structure

### Dashboard Overview
The dashboard is the first view administrators see, designed to open with the most characteristic element of the condominium management world.

**Hero Section:**
- **Headline**: "Quản lý chung cư thông minh"
- **Subheadline**: "Bảng điều khiển tổng quan về hoạt động tòa nhà"
- **Key Stats Row**: 3 cards side-by-side on desktop
  - Card 1: "Căn hộ đang thuê" - number with large typography
  - Card 2: "Yêu cầu bảo trì chờ xử lý" - icon + number
  - Card 3: "Thu phí tháng này" - amount with currency symbol

**NOT following AI defaults:**
- ❌ Not a warm cream background
- ❌ Not high-contrast serif with terracotta accent
- ❌ Not identical rounded cards with soft shadow
- ✅ Using deep charcoal primary with cyan accent
- ✅ Using Space Grotesk display typography
- ✅ Using key stats with specific numbers, not generic "0 visitors"

### Navigation Sidebar
- **Left-aligned**, collapsible
- **Items**:
  1. Trang chủ (Dashboard)
  2. Tòa nhà (Buildings)
  3. Căn hộ (Apartments)
  4. Chủ sở hữu (Owners)
  5. Cư dân (Residents)
  6. Hóa đơn (Bills)
  7. Bảo trì (Maintenance)
  8. Thông báo (Notifications)
  9. Phân quyền (Permissions)
  10. Cài đặt (Settings)

- **On hover**: Icon + label reveal
- **On collapse**: Icon-only with tooltip on hover
- **Active state**: Background tint in accent cyan, white icon

### Key Pages

#### Buildings Management Page
- Data table with columns: Tên tòa nhà, Số căn hộ, Trạng thái, Hành động
- Actions: Xem chi tiết, Sửa, Xóa
- Add building button: Primary cyan, full width on mobile

#### Apartments Management Page
- Filterable by: Tòa nhà, Tầng, Trạng thái
- Bulk actions: Phát thẻ, Cập nhật trạng thái
- Responsive table on mobile (horizontal scroll)

#### Maintenance Requests Page
- Table with: Yêu cầu, Căn hộ, Cư dân, Mức độ ưu tiên, Trạng thái, Hành động
- Filter by: Mức độ ưu tiên, Trạng thái
- Quick action: Cập nhật trạng thái inline

### Empty States (per design system)
- **No buildings**: Illustrative icon of building outline
- **Headline**: "Chưa có tòa nhà nào"
- **CTA**: "Thêm tòa nhà đầu tiên" (primary button)
- **Text**: "Hệ thống sẽ hiển thị tổng quan về các tòa nhà của bạn sau khi thêm tòa nhà đầu tiên"

### Error States
- **API error**: Specific title, explanation, "Thử lại" button
- **404 page**: "Trang không tìm thấy", descriptive text, "Quay về trang chủ"

### Motion
- **Page load**: Fade-in sequence of components (respecting reduced motion preference)
- **Row hover**: Background tint transition (0.2s)
- **Button hover**: Color intensity change
- **No scattered effects** on every element

### Accessibility
- Skip link at top: "Bỏ qua navigation"
- Focus visible: 2px outline accent cyan
- ARIA labels on collapsible sidebar
- Descriptive page titles
- Color contrast meets 4.5:1 minimum

## Color Usage
- Primary text: #1A1F2E (dark charcoal)
- Secondary text: #6B7280 (neutral medium)
- Links: #00B8D9 (accent cyan, underline on hover)
- Buttons primary: #00B8D9 (cyan)
- Badges status: Green #22C55E (active), Gray #6B7280 (inactive)
- Notifications: #F2A95C (warm accent)

## Typography Usage
- H1 page titles: Space Grotesk, 3rem, weight 700
- Section headings: Space Grotesk, 1.5rem, weight 600
- Body text: Inter, 1rem, weight 400
- Caption/interactive text: Inter, 0.875rem, weight 500
- All caps avoided for labels (per design principles)