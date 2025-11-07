# Home Depot Pricing Integration Setup Guide

## Overview

This guide explains how to set up the Home Depot pricing integration using SerpAPI. This feature adds real-time pricing and product links to your Bill of Materials (BOM) calculations.

## Prerequisites

- SerpAPI account with Home Depot API access
- 250 free searches available (or paid plan)
- Node.js environment with environment variable support

## Step-by-Step Setup

### 1. Create SerpAPI Account

1. **Sign up** at [https://serpapi.com/](https://serpapi.com/)
2. **Navigate** to your dashboard
3. **Copy** your API key from the dashboard

### 2. Configure Environment Variables

Add the following to your `.env` file in the project root:

```bash
# Home Depot Pricing Integration
SERP_API_KEY=your_api_key_here
```

**Important**: Replace `your_api_key_here` with your actual SerpAPI key.

### 3. Test API Connection

Test the API connection with a simple search:

```bash
# Test with curl (replace YOUR_API_KEY with your actual key)
curl "https://serpapi.com/search.json?engine=home_depot&q=2x4+lumber&api_key=YOUR_API_KEY"
```

Expected response should include:
- `organic_results` array with product listings
- `price` objects with extracted prices
- `link` fields with Home Depot product URLs

### 4. Verify Integration

Once the API key is configured:

1. **Start** the application
2. **Generate** a BOM with common materials (2x4 lumber, drywall, paint)
3. **Check** that pricing data appears in the Material Panel
4. **Verify** product links open correctly
5. **Confirm** total cost calculation works

## API Usage & Limits

### Free Plan Limits
- **250 searches** per month
- **Rate limiting** built into the application
- **Search counter** displayed in UI

### Paid Plans
- **Higher limits** available
- **Better performance** and reliability
- **Priority support**

## How It Works

### Automatic Pricing Lookup
1. **BOM Generation**: When AI generates a material list
2. **Search Queries**: Each material is searched on Home Depot
3. **Price Extraction**: Best matching product price is extracted
4. **Link Generation**: Product link is included for easy ordering
5. **Cost Calculation**: Total cost is calculated (quantity × unit price)

### Search Optimization
- **Smart Queries**: Optimized search terms for better matches
- **Best Match**: Algorithm finds closest product match
- **Fallback**: Uses first result if no exact match found

## Troubleshooting

### Common Issues

#### API Key Not Working
**Symptoms**: "SERP_API_KEY not found" error
**Solution**: 
- Verify key is correctly set in `.env` file
- Restart the application after adding the key
- Check for typos in the environment variable name

#### No Search Results
**Symptoms**: "No product found" for materials
**Solution**:
- Some materials may not have exact matches
- Try more generic search terms
- Check if material names are too specific

#### API Limit Reached
**Symptoms**: "API search limit reached" error
**Solution**:
- Wait for monthly reset (free plan)
- Upgrade to paid plan for higher limits
- Use manual pricing for remaining materials

#### Pricing Accuracy Issues
**Symptoms**: Prices seem incorrect
**Solution**:
- Prices are estimates from Home Depot
- Verify prices before ordering
- Consider regional price variations

### Debug Mode

Enable debug logging by adding to your `.env`:

```bash
DEBUG=pricing:*
```

This will show:
- Search queries being used
- API responses
- Matching logic decisions

## Manual Testing Checklist

- [ ] SerpAPI key configured in `.env`
- [ ] API connection test successful
- [ ] BOM generation includes pricing
- [ ] Product links open correctly
- [ ] Total cost calculation accurate
- [ ] API search counter decreases
- [ ] Error handling works when API fails
- [ ] Pricing display responsive in different browsers

## Best Practices

### Search Query Optimization
- Use **generic terms** for better matches
- Include **common keywords** (lumber, construction, building)
- Avoid **overly specific** product codes

### Rate Limit Management
- **Monitor** remaining searches in UI
- **Plan** testing to avoid exceeding limits
- **Use** manual pricing for edge cases

### Price Verification
- **Always verify** prices before ordering
- **Consider** regional variations
- **Check** for sales or promotions

## Security Considerations

### API Key Protection
- **Never commit** API keys to version control
- **Use** environment variables only
- **Rotate** keys periodically

### Data Privacy
- **Search queries** are sent to SerpAPI
- **No personal data** is transmitted
- **Product data** comes from Home Depot

## Support

### SerpAPI Support
- **Documentation**: [https://serpapi.com/home-depot-search-api](https://serpapi.com/home-depot-search-api)
- **Support**: Available through SerpAPI dashboard
- **Status**: Check [https://status.serpapi.com/](https://status.serpapi.com/)

### Application Support
- **Issues**: Report through project issue tracker
- **Questions**: Check existing documentation first
- **Enhancements**: Submit feature requests

## Cost Considerations

### Free Plan (250 searches/month)
- **Suitable for**: Light testing and development
- **Limitations**: May run out during heavy testing
- **Best for**: Initial setup and basic testing

### Paid Plans
- **Higher limits**: 1,000+ searches per month
- **Better reliability**: Priority processing
- **Support**: Direct support from SerpAPI team

## Future Enhancements

### Planned Features
- **Multiple retailers**: Lowe's, Menards integration
- **Price comparison**: Compare prices across retailers
- **Historical pricing**: Track price changes over time
- **Regional pricing**: Location-based price adjustments

### Integration Opportunities
- **Supplier APIs**: Direct integration with major suppliers
- **Inventory checking**: Real-time stock availability
- **Ordering integration**: Direct purchase capabilities

---

*This setup guide will be updated as the integration evolves and new features are added.*
