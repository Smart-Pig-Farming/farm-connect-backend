import sequelize from '../config/database';
import BestPracticeContent from '../models/BestPracticeContent';
import User from '../models/User';
import Role from '../models/Role';

interface ParsedPractice {
  title: string;
  description: string;
  steps: Array<{ id: number; text: string; order: number }>;
  benefits: string[];
  category: string;
}

const bestPracticesData = `
# Swine Farming Best Practices Guide

## 1. FEEDING/NUTRITION

### Practice 1: Phase Feeding Program
**Description:** Implement age-specific feeding programs that match nutritional requirements to pig growth stages.
**Steps:**
- Assess current growth stage of pigs
- Select appropriate feed formula for each phase
- Monitor daily feed intake levels
- Adjust portions based on consumption patterns
- Transition gradually between feed types
**Benefits:**
- Optimized growth rates
- Reduced feed costs
- Better nutrient utilization

### Practice 2: Water Quality Management
**Description:** Ensure clean, fresh water availability at all times with regular quality testing.
**Steps:**
- Install adequate water nipples/drinkers
- Check water flow rates daily
- Test water quality monthly
- Clean water systems weekly
- Monitor water consumption patterns
**Benefits:**
- Improved feed conversion
- Better health status
- Enhanced growth performance

### Practice 3: Feed Storage Protocol
**Description:** Maintain proper feed storage conditions to prevent spoilage and contamination.
**Steps:**
- Store feed in moisture-proof containers
- Implement first-in-first-out rotation system
- Check for mold and pests weekly
- Maintain storage area temperature below 70°F
- Document all feed batch numbers
**Benefits:**
- Reduced feed waste
- Prevented mycotoxin exposure
- Lower disease risk

### Practice 4: Precision Feeding Technology
**Description:** Use automated feeding systems to deliver exact amounts based on individual pig needs.
**Steps:**
- Install electronic sow feeding stations
- Program individual pig feeding curves
- Monitor daily consumption electronically
- Adjust feed amounts based on body condition
- Generate feeding reports weekly
**Benefits:**
- Minimized feed waste
- Improved uniformity
- Better data tracking

### Practice 5: Alternative Feed Ingredients
**Description:** Incorporate cost-effective alternative ingredients while maintaining nutritional balance.
**Steps:**
- Analyze nutritional content of alternatives
- Calculate inclusion rates with nutritionist
- Test small batches first
- Monitor pig acceptance and performance
- Adjust formulations based on results
**Benefits:**
- Reduced feed costs
- Sustainable production
- Market flexibility

### Practice 6: Creep Feeding Management
**Description:** Provide specialized early nutrition for piglets while still nursing.
**Steps:**
- Start creep feed at 7 days age
- Use highly palatable starter formulas
- Place feeders away from sow
- Clean and refill feeders twice daily
- Gradually increase quantities offered
**Benefits:**
- Smoother weaning transition
- Higher weaning weights
- Reduced mortality

### Practice 7: Feed Additive Strategy
**Description:** Strategic use of probiotics, enzymes, and organic acids to enhance nutrition.
**Steps:**
- Identify specific herd challenges
- Select appropriate additives with veterinarian
- Follow manufacturer dosing guidelines
- Monitor pig response for 30 days
- Evaluate cost-benefit ratio quarterly
**Benefits:**
- Improved gut health
- Better feed efficiency
- Reduced antibiotic use

### Practice 8: Body Condition Scoring
**Description:** Regular assessment of pig body condition to adjust feeding programs.
**Steps:**
- Train staff on scoring system
- Score all breeding stock monthly
- Record scores in management system
- Adjust feed amounts for individuals
- Review herd averages quarterly
**Benefits:**
- Optimized reproduction
- Reduced feed waste
- Extended sow longevity

### Practice 9: Mycotoxin Prevention
**Description:** Implement comprehensive program to prevent and manage mycotoxin contamination.
**Steps:**
- Source feed from reputable suppliers
- Test incoming grain loads
- Use mycotoxin binders when needed
- Monitor pig performance indicators
- Document all test results
**Benefits:**
- Protected reproductive performance
- Maintained immunity
- Reduced mortality

### Practice 10: Feeding Behavior Monitoring
**Description:** Observe and record feeding patterns to identify health issues early.
**Steps:**
- Check feeders during each feeding
- Note any pigs not eating
- Record unusual feeding behaviors
- Investigate causes of reduced intake
- Adjust management accordingly
**Benefits:**
- Early disease detection
- Reduced treatment costs
- Better welfare outcomes

## 2. DISEASE CONTROL

### Practice 1: Biosecurity Protocol
**Description:** Comprehensive biosecurity measures to prevent disease introduction and spread.
**Steps:**
- Establish clean/dirty zones
- Require shower-in/shower-out procedures
- Implement 48-hour downtime for visitors
- Disinfect all vehicles entering farm
- Maintain perimeter fencing
**Benefits:**
- Disease prevention
- Reduced medication costs
- Improved productivity

### Practice 2: Vaccination Schedule
**Description:** Strategic vaccination program based on regional disease risks and herd history.
**Steps:**
- Consult veterinarian for risk assessment
- Develop age-specific vaccination calendar
- Train staff on proper injection techniques
- Record all vaccinations given
- Monitor vaccine storage temperatures
**Benefits:**
- Enhanced immunity
- Lower mortality rates
- Reduced treatment needs

### Practice 3: Quarantine Procedures
**Description:** Isolate new arrivals and sick animals to prevent disease transmission.
**Steps:**
- Designate separate quarantine facilities
- Quarantine new pigs for 30 days
- Test for diseases before mixing
- Use separate equipment and clothing
- Monitor daily for clinical signs
**Benefits:**
- Protected herd health
- Early disease detection
- Prevented outbreaks

### Practice 4: Regular Health Monitoring
**Description:** Daily observation and recording of pig health status and behaviors.
**Steps:**
- Check all pigs twice daily
- Record temperatures of sick pigs
- Document clinical signs observed
- Track mortality and morbidity rates
- Review trends weekly with veterinarian
**Benefits:**
- Early intervention
- Reduced losses
- Better treatment outcomes

### Practice 5: Pest Control Program
**Description:** Integrated pest management to control rodents, flies, and other vectors.
**Steps:**
- Seal all entry points
- Place bait stations strategically
- Remove standing water sources
- Apply larvicides to manure pits
- Monitor and document pest levels
**Benefits:**
- Reduced disease transmission
- Lower feed losses
- Improved biosecurity

### Practice 6: Cleaning and Disinfection
**Description:** Systematic cleaning and disinfection between production batches.
**Steps:**
- Remove all organic matter
- Apply detergent and scrub surfaces
- Rinse thoroughly with water
- Apply approved disinfectant
- Allow adequate drying time
**Benefits:**
- Pathogen elimination
- Reduced infection pressure
- Better pig performance

### Practice 7: Diagnostic Testing Program
**Description:** Regular laboratory testing to monitor disease status and guide interventions.
**Steps:**
- Collect samples per veterinary protocol
- Submit to accredited laboratory
- Review results with veterinarian
- Adjust health program based on findings
- Document all test results
**Benefits:**
- Accurate diagnosis
- Targeted treatments
- Cost-effective interventions

### Practice 8: Antimicrobial Stewardship
**Description:** Responsible use of antibiotics following veterinary guidance and regulations.
**Steps:**
- Use antibiotics only when necessary
- Follow veterinary prescriptions exactly
- Complete full treatment courses
- Record all medication use
- Implement withdrawal periods
**Benefits:**
- Preserved drug effectiveness
- Regulatory compliance
- Consumer confidence

### Practice 9: Needle Management
**Description:** Proper needle selection, use, and disposal to prevent disease spread and injuries.
**Steps:**
- Select appropriate needle size
- Change needles every 10-20 pigs
- Never straighten bent needles
- Dispose in sharps containers
- Document any broken needles
**Benefits:**
- Reduced abscess formation
- Prevented disease transmission
- Worker safety

### Practice 10: Mortality Management
**Description:** Proper handling and disposal of dead pigs to prevent disease spread.
**Steps:**
- Remove mortalities promptly
- Use dedicated equipment for removal
- Store in covered, secure area
- Arrange timely disposal/rendering
- Record cause of death
**Benefits:**
- Disease control
- Environmental protection
- Regulatory compliance

## 3. GROWTH & WEIGHT MANAGEMENT

### Practice 1: Regular Weight Monitoring
**Description:** Systematic weighing to track growth rates and identify poor performers.
**Steps:**
- Weigh sample groups weekly
- Use calibrated scales
- Record weights in management system
- Calculate average daily gain
- Compare to breed standards
**Benefits:**
- Performance tracking
- Early problem detection
- Marketing optimization

### Practice 2: Stocking Density Management
**Description:** Maintain appropriate space allowances for optimal growth and welfare.
**Steps:**
- Calculate space per pig weight
- Adjust group sizes as pigs grow
- Monitor for overcrowding signs
- Sort pigs by size regularly
- Document pen densities
**Benefits:**
- Improved growth rates
- Reduced aggression
- Better feed efficiency

### Practice 3: Growth Curve Analysis
**Description:** Use data analytics to optimize growth patterns and predict market weights.
**Steps:**
- Input weekly weight data
- Generate growth curves
- Identify outliers and slow growers
- Adjust feeding strategies accordingly
- Forecast market-ready dates
**Benefits:**
- Predictable production
- Optimized feed costs
- Market planning

### Practice 4: Environmental Enrichment
**Description:** Provide materials and activities to promote natural behaviors and reduce stress.
**Steps:**
- Install toy dispensers or chains
- Provide rooting materials
- Rotate enrichment items weekly
- Monitor pig interaction levels
- Document behavioral improvements
**Benefits:**
- Reduced tail biting
- Better growth rates
- Improved welfare

### Practice 5: Sorting and Grouping
**Description:** Strategic grouping of pigs by size and growth rate for uniform development.
**Steps:**
- Sort pigs at weaning
- Re-sort every 3-4 weeks
- Keep uniform groups together
- Provide appropriate feed for each group
- Monitor group dynamics
**Benefits:**
- Reduced competition
- Uniform market weights
- Efficient space use

### Practice 6: Light Management Program
**Description:** Optimize lighting schedules to promote growth and natural behaviors.
**Steps:**
- Provide 16 hours light daily
- Use 40-50 lux intensity
- Install timer controls
- Maintain consistent schedules
- Check and replace bulbs regularly
**Benefits:**
- Enhanced feed intake
- Better growth rates
- Improved reproduction

### Practice 7: Compensatory Growth Strategy
**Description:** Manage feeding to take advantage of compensatory growth potential.
**Steps:**
- Identify growth-restricted pigs
- Provide enhanced nutrition
- Monitor catch-up growth rates
- Adjust marketing plans
- Document recovery patterns
**Benefits:**
- Recovered performance
- Reduced culling
- Market flexibility

### Practice 8: Gender-Specific Management
**Description:** Tailor management practices to differences between barrows and gilts.
**Steps:**
- Separate by gender when possible
- Adjust feed programs for each
- Monitor growth rate differences
- Plan marketing strategies accordingly
- Track performance by gender
**Benefits:**
- Optimized nutrition
- Better carcass quality
- Targeted marketing

### Practice 9: Heat Stress Mitigation
**Description:** Implement cooling strategies to maintain growth during hot weather.
**Steps:**
- Install sprinkler systems
- Increase ventilation rates
- Adjust feeding times
- Provide extra water access
- Monitor temperature hourly
**Benefits:**
- Maintained feed intake
- Consistent growth
- Reduced mortality

### Practice 10: Performance Benchmarking
**Description:** Compare growth metrics against industry standards and historical data.
**Steps:**
- Collect key performance indicators
- Compare to industry databases
- Analyze trends over time
- Identify improvement opportunities
- Set realistic targets
**Benefits:**
- Continuous improvement
- Competitive advantage
- Informed decisions

## 4. ENVIRONMENT MANAGEMENT

### Practice 1: Ventilation System Optimization
**Description:** Maintain optimal air quality through proper ventilation management.
**Steps:**
- Set minimum ventilation rates
- Adjust for pig size and season
- Monitor ammonia levels weekly
- Clean air inlets monthly
- Service fans quarterly
**Benefits:**
- Improved respiratory health
- Better growth rates
- Reduced mortality

### Practice 2: Temperature Control
**Description:** Maintain age-appropriate temperatures throughout production stages.
**Steps:**
- Install accurate thermometers
- Set thermostats for each stage
- Monitor temperatures twice daily
- Adjust heaters/coolers as needed
- Record daily highs and lows
**Benefits:**
- Optimal comfort
- Reduced stress
- Energy efficiency

### Practice 3: Humidity Management
**Description:** Control moisture levels to prevent respiratory issues and structural damage.
**Steps:**
- Maintain 60-70% relative humidity
- Use hygrometers in each room
- Increase ventilation if too humid
- Check for water leaks regularly
- Document humidity readings
**Benefits:**
- Respiratory health
- Structural preservation
- Comfort optimization

### Practice 4: Manure Management System
**Description:** Efficient waste handling to minimize environmental impact and odor.
**Steps:**
- Empty pits on regular schedule
- Maintain proper pit ventilation
- Add pit additives if needed
- Monitor pit levels weekly
- Follow nutrient management plan
**Benefits:**
- Reduced emissions
- Odor control
- Regulatory compliance

### Practice 5: Water Conservation
**Description:** Implement practices to reduce water waste while meeting pig needs.
**Steps:**
- Fix leaks immediately
- Adjust nipple drinker flow rates
- Install water meters
- Monitor consumption patterns
- Recycle water where appropriate
**Benefits:**
- Lower costs
- Environmental stewardship
- Resource efficiency

### Practice 6: Energy Efficiency Program
**Description:** Reduce energy consumption through equipment upgrades and management.
**Steps:**
- Conduct energy audit annually
- Upgrade to efficient lighting
- Install variable speed fans
- Insulate buildings properly
- Monitor energy usage monthly
**Benefits:**
- Reduced costs
- Environmental sustainability
- Improved profitability

### Practice 7: Flooring Management
**Description:** Maintain appropriate flooring conditions for pig comfort and hygiene.
**Steps:**
- Inspect floors for damage weekly
- Repair cracks and holes promptly
- Ensure proper drainage slopes
- Provide dry bedding where used
- Replace worn slats timely
**Benefits:**
- Reduced injuries
- Better hygiene
- Improved welfare

### Practice 8: Noise Level Control
**Description:** Minimize excessive noise to reduce stress and improve pig welfare.
**Steps:**
- Maintain equipment to reduce noise
- Train staff in quiet handling
- Use rubber mats in high-traffic areas
- Schedule noisy activities strategically
- Monitor decibel levels periodically
**Benefits:**
- Reduced stress
- Better performance
- Worker comfort

### Practice 9: Emergency Backup Systems
**Description:** Ensure critical systems continue operating during power failures.
**Steps:**
- Install backup generators
- Test systems monthly
- Maintain fuel reserves
- Install alarm systems
- Document emergency procedures
**Benefits:**
- Prevented losses
- Continuous operation
- Peace of mind

### Practice 10: Environmental Monitoring Technology
**Description:** Use sensors and automation to continuously monitor environmental conditions.
**Steps:**
- Install temperature/humidity sensors
- Set up automatic alerts
- Review data trends daily
- Calibrate sensors quarterly
- Integrate with control systems
**Benefits:**
- Real-time monitoring
- Quick response
- Data-driven decisions

## 5. BREEDING & INSEMINATION

### Practice 1: Heat Detection Protocol
**Description:** Systematic approach to identify sows and gilts in estrus for optimal breeding.
**Steps:**
- Check for heat twice daily
- Use boar exposure for stimulation
- Look for standing reflex
- Record all heat observations
- Mark sows ready for breeding
**Benefits:**
- Improved conception rates
- Accurate timing
- Better productivity

### Practice 2: Semen Quality Control
**Description:** Ensure high-quality semen through proper handling and evaluation.
**Steps:**
- Check semen upon delivery
- Store at 61-64°F
- Rotate stock (first in, first out)
- Evaluate motility before use
- Document batch numbers used
**Benefits:**
- Higher conception rates
- Reduced returns
- Quality assurance

### Practice 3: Artificial Insemination Technique
**Description:** Proper AI procedures to maximize conception rates and litter sizes.
**Steps:**
- Clean vulva thoroughly
- Insert catheter at upward angle
- Stimulate sow during insemination
- Allow 3-5 minutes for dose
- Record time and technician
**Benefits:**
- Genetic improvement
- Disease control
- Cost efficiency

### Practice 4: Breeding Schedule Management
**Description:** Optimize timing of breeding to maximize facility utilization and pig flow.
**Steps:**
- Plan weekly breeding targets
- Synchronize estrus when needed
- Maintain consistent group sizes
- Track breeding performance
- Adjust for seasonal variations
**Benefits:**
- Predictable production
- Facility optimization
- Steady pig flow

### Practice 5: Boar Management
**Description:** Proper care and use of boars for heat detection and natural service.
**Steps:**
- Provide adequate boar housing
- Maintain 1:20 boar-to-sow ratio
- Rotate boar usage
- Monitor boar health closely
- Evaluate libido regularly
**Benefits:**
- Effective stimulation
- Better heat detection
- Breeding success

### Practice 6: Pregnancy Diagnosis
**Description:** Early and accurate pregnancy detection to identify open sows quickly.
**Steps:**
- Ultrasound at 28-35 days
- Recheck non-returns at 42 days
- Mark confirmed pregnant sows
- Rebreed open sows promptly
- Calculate conception rates
**Benefits:**
- Early detection
- Reduced non-productive days
- Improved efficiency

### Practice 7: Genetic Selection Program
**Description:** Strategic selection of breeding stock to improve herd genetics.
**Steps:**
- Define breeding objectives
- Track performance data
- Calculate breeding values
- Select top performers
- Plan matings strategically
**Benefits:**
- Genetic progress
- Improved performance
- Market advantages

### Practice 8: Gilt Development Program
**Description:** Prepare replacement gilts properly for successful breeding careers.
**Steps:**
- Select at 50-60 kg
- Provide boar exposure from 160 days
- Record puberty dates
- Breed on second or third heat
- Monitor body condition closely
**Benefits:**
- Better longevity
- Higher lifetime production
- Reduced culling

### Practice 9: Breeding Area Hygiene
**Description:** Maintain clean breeding facilities to prevent reproductive infections.
**Steps:**
- Clean breeding area daily
- Disinfect after each use
- Use clean AI equipment
- Wash hands between sows
- Store supplies properly
**Benefits:**
- Reduced infections
- Better conception
- Healthier litters

### Practice 10: Reproductive Record Keeping
**Description:** Detailed documentation of all breeding activities and outcomes.
**Steps:**
- Record all heat dates
- Document breeding details
- Track pregnancy checks
- Monitor farrowing rates
- Analyze reproductive KPIs
**Benefits:**
- Performance tracking
- Problem identification
- Management decisions

## 6. FARROWING MANAGEMENT

### Practice 1: Pre-Farrowing Preparation
**Description:** Prepare sows and facilities for successful farrowing.
**Steps:**
- Move sows 5-7 days before due date
- Wash and disinfect sows
- Clean and disinfect farrowing crates
- Adjust room temperature to 68-72°F
- Prepare farrowing supplies
**Benefits:**
- Reduced infections
- Better preparation
- Lower mortality

### Practice 2: Farrowing Supervision
**Description:** Active monitoring and assistance during the farrowing process.
**Steps:**
- Monitor sows closely near due date
- Attend farrowings when possible
- Assist with difficult births
- Clear airways of newborns
- Document farrowing details
**Benefits:**
- Reduced stillbirths
- Better survival
- Healthier piglets

### Practice 3: Colostrum Management
**Description:** Ensure all piglets receive adequate colostrum within first hours of life.
**Steps:**
- Dry piglets immediately after birth
- Help weak piglets nurse
- Split-suckle large litters
- Monitor piglet nursing
- Supplement if necessary
**Benefits:**
- Improved immunity
- Better survival
- Stronger piglets

### Practice 4: Piglet Processing Protocol
**Description:** Standardized procedures for processing newborn piglets.
**Steps:**
- Process within 24 hours
- Clip needle teeth carefully
- Dock tails appropriately
- Give iron injection
- Castrate males if required
**Benefits:**
- Uniform management
- Reduced injuries
- Better health

### Practice 5: Cross-Fostering Strategy
**Description:** Balance litter sizes to match sow capacity and piglet needs.
**Steps:**
- Assess sow milk production
- Count functional teats
- Move piglets within 24 hours
- Match piglet sizes
- Record all movements
**Benefits:**
- Improved survival
- Better growth
- Optimized production

### Practice 6: Creep Area Management
**Description:** Provide supplemental heat and feed area for piglets.
**Steps:**
- Set heat lamp to 90-95°F
- Use heat mats or covers
- Keep area clean and dry
- Provide fresh creep feed
- Monitor piglet usage
**Benefits:**
- Thermal comfort
- Reduced crushing
- Better growth

### Practice 7: Sow Feeding Program
**Description:** Optimize lactation feeding to maximize milk production.
**Steps:**
- Gradually increase feed after farrowing
- Feed 3-4 times daily
- Monitor feed intake closely
- Adjust for body condition
- Provide constant water access
**Benefits:**
- Maximum milk production
- Reduced weight loss
- Better rebreeding

### Practice 8: Health Monitoring
**Description:** Daily observation of sow and piglet health during lactation.
**Steps:**
- Check sow temperature daily
- Monitor for mastitis signs
- Observe piglet vitality
- Treat scours promptly
- Record all treatments
**Benefits:**
- Early intervention
- Reduced mortality
- Better outcomes

### Practice 9: Weaning Management
**Description:** Systematic approach to weaning for minimal stress.
**Steps:**
- Wean at consistent age
- Remove sow from piglets
- Keep piglets in familiar environment
- Monitor feed intake closely
- Provide comfort measures
**Benefits:**
- Reduced stress
- Better transition
- Maintained growth

### Practice 10: Farrowing Room Sanitation
**Description:** Maintain hygiene standards throughout lactation period.
**Steps:**
- Remove manure twice daily
- Disinfect tools after use
- Control flies and rodents
- Maintain foot baths
- Clean feeders daily
**Benefits:**
- Disease prevention
- Better environment
- Healthier pigs

## 7. RECORD & FARM MANAGEMENT

### Practice 1: Production Record System
**Description:** Comprehensive documentation of all production activities and outcomes.
**Steps:**
- Choose appropriate software or system
- Train all staff on data entry
- Record events as they occur
- Back up data regularly
- Generate reports monthly
**Benefits:**
- Performance tracking
- Informed decisions
- Historical analysis

### Practice 2: Individual Pig Identification
**Description:** Unique identification system for tracking individual animals.
**Steps:**
- Assign ID at birth or arrival
- Use ear tags or tattoos
- Record ID in database
- Link all events to ID
- Maintain ID throughout life
**Benefits:**
- Complete traceability
- Individual tracking
- Regulatory compliance

### Practice 3: Standard Operating Procedures
**Description:** Written protocols for all routine farm operations.
**Steps:**
- Document all key procedures
- Include step-by-step instructions
- Train staff on SOPs
- Review and update annually
- Post in relevant areas
**Benefits:**
- Consistency
- Quality control
- Training tool

### Practice 4: Key Performance Indicators
**Description:** Monitor critical metrics to evaluate farm performance.
**Steps:**
- Define relevant KPIs
- Set target values
- Calculate monthly
- Compare to benchmarks
- Address underperformance
**Benefits:**
- Performance monitoring
- Problem identification
- Continuous improvement

### Practice 5: Staff Training Program
**Description:** Systematic approach to developing employee knowledge and skills.
**Steps:**
- Assess training needs
- Develop training materials
- Schedule regular sessions
- Document training completed
- Evaluate effectiveness
**Benefits:**
- Skilled workforce
- Better performance
- Employee retention

### Practice 6: Inventory Management
**Description:** Track and control all farm supplies and materials.
**Steps:**
- Maintain inventory lists
- Set minimum stock levels
- Conduct monthly counts
- Record usage rates
- Plan purchases ahead
**Benefits:**
- Cost control
- Avoided stockouts
- Reduced waste

### Practice 7: Maintenance Schedule
**Description:** Preventive maintenance program for equipment and facilities.
**Steps:**
- List all equipment
- Set maintenance intervals
- Create maintenance calendar
- Document work completed
- Track repair costs
**Benefits:**
- Reduced breakdowns
- Extended equipment life
- Lower costs

### Practice 8: Visitor Log Management
**Description:** Document all farm visitors for biosecurity and traceability.
**Steps:**
- Require sign-in for all visitors
- Record contact information
- Note areas visited
- Document last pig contact
- File logs systematically
**Benefits:**
- Disease traceability
- Biosecurity compliance
- Risk management

### Practice 9: Emergency Response Plan
**Description:** Prepared protocols for various emergency situations.
**Steps:**
- Identify potential emergencies
- Develop response procedures
- Post emergency contacts
- Train staff regularly
- Review plans annually
**Benefits:**
- Quick response
- Minimized losses
- Staff safety

### Practice 10: Data Analysis and Reporting
**Description:** Regular analysis of farm data to identify trends and opportunities.
**Steps:**
- Compile data monthly
- Calculate key metrics
- Identify trends
- Compare periods
- Share with team
**Benefits:**
- Data-driven decisions
- Trend identification
- Performance improvement

## 8. MARKETING & FINANCE

### Practice 1: Market Analysis
**Description:** Regular monitoring of market conditions and price trends.
**Steps:**
- Track daily market prices
- Monitor futures markets
- Analyze seasonal patterns
- Follow industry news
- Predict price movements
**Benefits:**
- Better timing
- Maximized revenue
- Risk awareness

### Practice 2: Cost of Production Calculation
**Description:** Detailed tracking of all production costs per unit.
**Steps:**
- Track all input costs
- Allocate overhead expenses
- Calculate per-pig costs
- Compare to market prices
- Identify cost savings
**Benefits:**
- Profitability awareness
- Pricing decisions
- Cost control

### Practice 3: Marketing Contract Strategy
**Description:** Strategic use of contracts to manage price risk.
**Steps:**
- Evaluate contract options
- Compare to spot market
- Negotiate terms
- Diversify marketing methods
- Monitor contract compliance
**Benefits:**
- Price stability
- Risk management
- Predictable income

### Practice 4: Cash Flow Management
**Description:** Monitor and project cash flows to ensure financial stability.
**Steps:**
- Track income and expenses
- Project monthly cash flows
- Maintain cash reserves
- Plan for seasonal variations
- Review weekly
**Benefits:**
- Financial stability
- Better planning
- Avoided crises

### Practice 5: Budget Planning
**Description:** Annual budgeting process to plan and control finances.
**Steps:**
- Review previous year performance
- Project production levels
- Estimate revenues
- Plan expenses
- Monitor variance monthly
**Benefits:**
- Financial control
- Goal setting
- Performance tracking

### Practice 6: Value-Added Marketing
**Description:** Explore opportunities to capture additional value from production.
**Steps:**
- Research premium markets
- Consider certification programs
- Evaluate direct marketing
- Calculate additional costs
- Test market acceptance
**Benefits:**
- Higher prices
- Market differentiation
- Increased profits

### Practice 7: Risk Management Program
**Description:** Comprehensive approach to identifying and managing business risks.
**Steps:**
- Identify risk factors
- Evaluate insurance options
- Consider hedging strategies
- Maintain emergency funds
- Review annually
**Benefits:**
- Protected income
- Reduced volatility
- Business continuity

### Practice 8: Relationship Banking
**Description:** Build strong relationships with financial institutions.
**Steps:**
- Communicate regularly with lender
- Provide financial statements
- Discuss plans and challenges
- Maintain good credit
- Explore financing options
**Benefits:**
- Credit access
- Better terms
- Financial support

### Practice 9: Tax Planning Strategy
**Description:** Optimize tax position through proper planning and documentation.
**Steps:**
- Maintain accurate records
- Track deductible expenses
- Consider timing of sales
- Work with tax professional
- Plan for tax payments
**Benefits:**
- Tax optimization
- Compliance
- Cash preservation

### Practice 10: Performance Benchmarking
**Description:** Compare financial performance to industry standards.
**Steps:**
- Join benchmarking programs
- Submit accurate data
- Review comparative reports
- Identify improvement areas
- Implement changes
**Benefits:**
- Competitive insight
- Performance gaps identified
- Continuous improvement
`;

class BestPracticesParser {
  
  // Map markdown category names to backend category keys
  private static readonly CATEGORY_MAPPING: Record<string, string> = {
    'FEEDING/NUTRITION': 'feeding_nutrition',
    'FEEDING': 'feeding_nutrition',
    'DISEASE CONTROL': 'disease_control',
    'GROWTH & WEIGHT MANAGEMENT': 'growth_weight',
    'ENVIRONMENT MANAGEMENT': 'environment_management',
    'BREEDING & INSEMINATION': 'breeding_insemination',
    'FARROWING MANAGEMENT': 'farrowing_management',
    'RECORD & FARM MANAGEMENT': 'record_management',
    'MARKETING & FINANCE': 'marketing_finance'
  };
  
  /**
   * Parse the markdown content into structured practices
   */
  static parseBestPractices(content: string): ParsedPractice[] {
    const practices: ParsedPractice[] = [];
    const sections = content.split(/## \d+\./);
    
    for (const section of sections) {
      if (!section.trim()) continue;
      
      const categoryMatch = section.match(/^([A-Z\s&]+)/);
      if (!categoryMatch) continue;
      
      const category = categoryMatch[1].trim();
      const practiceMatches = section.matchAll(/### Practice \d+: (.+?)\n\*\*Description:\*\* (.+?)\n\*\*Steps:\*\*([\s\S]*?)\n\*\*Benefits:\*\*([\s\S]*?)(?=\n### |$)/g);
      
      for (const match of practiceMatches) {
        const [, title, description, stepsText, benefitsText] = match;
        
        const steps = this.parseSteps(stepsText);
        const benefits = this.parseBenefits(benefitsText);
        
        // Map the category to the backend format
        const backendCategory = this.CATEGORY_MAPPING[category] || category.toLowerCase().replace(/\s+/g, '_');
        
        practices.push({
          title: title.trim(),
          description: description.trim(),
          steps,
          benefits,
          category: backendCategory
        });
      }
    }
    
    return practices;
  }
  
  /**
   * Parse steps section into structured array
   */
  private static parseSteps(stepsText: string): Array<{ id: number; text: string; order: number }> {
    const stepLines = stepsText.split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-'))
      .map(line => line.substring(1).trim());
    
    return stepLines.map((text, index) => ({
      id: index + 1,
      text,
      order: index + 1
    }));
  }
  
  /**
   * Parse benefits section into array
   */
  private static parseBenefits(benefitsText: string): string[] {
    return benefitsText.split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-'))
      .map(line => line.substring(1).trim());
  }
}

/**
 * Main function to populate the database
 */
async function populateBestPractices() {
  try {
    console.log('🚀 Starting Best Practices population...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    // Set up associations
    User.belongsTo(Role, { foreignKey: 'role_id' });
    Role.hasMany(User, { foreignKey: 'role_id' });
    
    // Find an admin user to assign as creator
    let adminUser = await User.findOne({
      include: [{
        model: Role,
        where: { name: 'admin' },
        required: true
      }]
    });
    
    let createdBy: number;
    
    if (!adminUser) {
      console.log('⚠️  No admin user found, looking for any user...');
      const anyUser = await User.findOne();
      if (!anyUser) {
        throw new Error('No users found in database. Please create a user first.');
      }
      console.log(`📝 Using user: ${anyUser.email} as creator`);
      createdBy = anyUser.id;
    } else {
      console.log(`📝 Using admin user: ${adminUser.email} as creator`);
      createdBy = adminUser.id;
    }
    
    // Parse the practices data
    const practices = BestPracticesParser.parseBestPractices(bestPracticesData);
    console.log(`📊 Parsed ${practices.length} best practices`);
    
    // Clear existing practices (optional - remove if you want to keep existing data)
    console.log('🧹 Clearing existing best practices...');
    await BestPracticeContent.destroy({ where: {} });
    
    // Insert new practices
    let insertedCount = 0;
    
    for (const practice of practices) {
      try {
        await BestPracticeContent.create({
          title: practice.title,
          description: practice.description,
          steps_json: practice.steps,
          benefits_json: practice.benefits,
          categories: [practice.category],
          language: 'en',
          is_published: true,
          is_deleted: false,
          read_count: 0,
          created_by: createdBy
        });
        
        insertedCount++;
        console.log(`✅ Created: ${practice.title}`);
        
      } catch (error) {
        console.error(`❌ Failed to create: ${practice.title}`, error);
      }
    }
    
    console.log(`🎉 Successfully populated ${insertedCount} best practices!`);
    
    // Show summary by category
    const summary = practices.reduce((acc, practice) => {
      acc[practice.category] = (acc[practice.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n📋 Summary by category:');
    Object.entries(summary).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} practices`);
    });
    
  } catch (error) {
    console.error('💥 Error populating best practices:', error);
    throw error;
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script if called directly
if (require.main === module) {
  populateBestPractices()
    .then(() => {
      console.log('✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export default populateBestPractices;
