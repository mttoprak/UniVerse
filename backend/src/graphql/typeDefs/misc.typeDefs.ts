export const miscTypeDefs = `#graphql
type Query {
    # Şehir koduna (il_id) göre ilçelerin listesini döner
    getDistricts(il: String!): [String!]!
}
`;